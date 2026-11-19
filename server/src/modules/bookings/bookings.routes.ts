import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';
import { pool, withTransaction } from '../../config/db';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';
import { addCalendarMonths, isFutureOrTodayDate } from '../../utils/date.utils';
import { createNotification } from '../notifications/notifications.service';

const router = Router();

// Core Business Rule: Minimum commitment of SIX MONTHS enforced at schema, service, and DB levels
const createBookingSchema = z.object({
  caretakerId: z.string().uuid(),
  childId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMonths: z.number().int().min(6, 'Minimum contract commitment is 6 months.').max(24),
  billingArrangement: z.enum(['MONTHLY_INSTALLMENT', 'QUARTERLY_MILESTONE']).default('MONTHLY_INSTALLMENT'),
  parentNotes: z.string().max(1000).optional(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the 6-month minimum contract terms.' }),
  }),
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.sub;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (role === 'PARENT') {
      whereClause = 'b.parent_id = ?';
      params.push(userId);
    } else if (role === 'CARETAKER') {
      whereClause = 'b.caretaker_id = ?';
      params.push(userId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        b.id, b.start_date AS startDate, b.end_date AS endDate, b.duration_months AS durationMonths,
        b.billing_arrangement AS billingArrangement, b.agreed_monthly_rate_btn AS agreedMonthlyRateBtn,
        b.estimated_total_btn AS estimatedTotalBtn, b.parent_notes AS parentNotes,
        b.status, b.cancellation_reason AS cancellationReason, b.created_at AS createdAt,
        p.id AS parentId, p.full_name AS parentName, p.phone AS parentPhone, p.dzongkhag AS parentDzongkhag,
        c.id AS caretakerId, c.full_name AS caretakerName, c.avatar_url AS caretakerAvatar, c.dzongkhag AS caretakerDzongkhag,
        ch.id AS childId, ch.full_name AS childName, ch.date_of_birth AS childDob, ch.allergies AS childAllergies
       FROM bookings b
       JOIN users p ON p.id = b.parent_id
       JOIN users c ON c.id = b.caretaker_id
       JOIN children ch ON ch.id = b.child_id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC`,
      params
    );

    res.json({
      bookings: rows.map((r) => ({
        ...r,
        agreedMonthlyRateBtn: Number(r.agreedMonthlyRateBtn),
        estimatedTotalBtn: Number(r.estimatedTotalBtn),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBookingSchema.parse(req.body);
    if (!isFutureOrTodayDate(data.startDate)) {
      throw new AppError('Contract start date cannot be in the past.', 400);
    }
    if (data.durationMonths < 6) {
      throw new AppError('All NestWell.BT contracts require a minimum commitment of 6 months.', 400);
    }

    const endDate = addCalendarMonths(data.startDate, data.durationMonths);
    const parentId = req.user!.sub;

    const bookingId = await withTransaction(async (conn) => {
      // 1. Verify child belongs to parent
      const [childRows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, full_name FROM children WHERE id = ? AND parent_id = ?',
        [data.childId, parentId]
      );
      if (!childRows[0]) {
        throw new AppError('Selected child profile not found.', 404);
      }

      // 2. Verify caretaker is APPROVED and available (FOR UPDATE lock prevents race conditions)
      const [caretakerRows] = await conn.execute<RowDataPacket[]>(
        `SELECT u.id, u.full_name, cp.monthly_rate_btn, cp.verification_status, cp.is_available
         FROM users u
         JOIN caretaker_profiles cp ON cp.user_id = u.id
         WHERE u.id = ? AND u.role = 'CARETAKER' AND u.is_active = TRUE
         FOR UPDATE`,
        [data.caretakerId]
      );
      const caretaker = caretakerRows[0];
      if (!caretaker) throw new AppError('Caretaker not found.', 404);
      if (caretaker.verification_status !== 'APPROVED') {
        throw new AppError('Only administrator-verified caretakers can be booked.', 400);
      }
      if (!caretaker.is_available) {
        throw new AppError('This caretaker is currently marked as unavailable.', 400);
      }

      // 3. Prevent duplicate pending request for same parent/caretaker/dates
      const [dupRows] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM bookings
         WHERE parent_id = ? AND caretaker_id = ? AND status = 'PENDING'
           AND start_date <= ? AND end_date >= ?`,
        [parentId, data.caretakerId, endDate, data.startDate]
      );
      if (dupRows.length > 0) {
        throw new AppError('You already have a pending booking request with this caretaker for these dates.', 409);
      }

      // 4. Prevent overlapping confirmed/active contracts for this caretaker
      const [overlapRows] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM bookings
         WHERE caretaker_id = ? AND status IN ('ACCEPTED', 'CONFIRMED', 'ACTIVE')
           AND start_date < ? AND end_date > ?`,
        [data.caretakerId, endDate, data.startDate]
      );
      if (overlapRows.length > 0) {
        throw new AppError('This caretaker already has a confirmed contract overlapping your selected dates.', 409);
      }

      const monthlyRate = Number(caretaker.monthly_rate_btn);
      const estimatedTotal = Number((monthlyRate * data.durationMonths).toFixed(2));
      const newBookingId = uuidv4();

      await conn.execute(
        `INSERT INTO bookings (
          id, parent_id, caretaker_id, child_id, start_date, end_date, duration_months,
          billing_arrangement, agreed_monthly_rate_btn, estimated_total_btn, parent_notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
          newBookingId,
          parentId,
          data.caretakerId,
          data.childId,
          data.startDate,
          endDate,
          data.durationMonths,
          data.billingArrangement,
          monthlyRate,
          estimatedTotal,
          data.parentNotes?.trim() || null,
        ]
      );

      // Generate installment schedule rows (payment architecture ready for Bhutan gateway)
      for (let i = 0; i < data.durationMonths; i++) {
        const dueDate = addCalendarMonths(data.startDate, i);
        await conn.execute(
          `INSERT INTO payment_schedules (id, booking_id, installment_number, due_date, amount_btn, status)
           VALUES (?, ?, ?, ?, ?, 'UNPAID')`,
          [uuidv4(), newBookingId, i + 1, dueDate, monthlyRate]
        );
      }

      await createNotification(
        {
          userId: data.caretakerId,
          type: 'NEW_BOOKING_REQUEST',
          title: 'New 6-Month Contract Request',
          message: `You received a ${data.durationMonths}-month childcare request starting ${data.startDate}.`,
          referenceId: newBookingId,
        },
        conn
      );

      return newBookingId;
    });

    res.status(201).json({ id: bookingId, startDate: data.startDate, endDate, status: 'PENDING' });
  } catch (err) {
    next(err);
  }
});

// Status transitions: Caretaker ACCEPT/REJECT, Parent CONFIRM/CANCEL
router.patch('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = z
      .object({
        status: z.enum(['ACCEPTED', 'REJECTED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
        reason: z.string().max(255).optional(),
      })
      .parse(req.body);

    const userId = req.user!.sub;
    const role = req.user!.role;

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
        [req.params.id]
      );
      const booking = rows[0];
      if (!booking) throw new AppError('Booking not found.', 404);

      if (role === 'CARETAKER') {
        if (booking.caretaker_id !== userId) throw new AppError('Unauthorized.', 403);
        if (!['ACCEPTED', 'REJECTED'].includes(status) || booking.status !== 'PENDING') {
          throw new AppError('Caretakers can only accept or reject pending requests.', 400);
        }
        if (status === 'ACCEPTED') {
          // Re-check overlap at acceptance time
          const [overlaps] = await conn.execute<RowDataPacket[]>(
            `SELECT id FROM bookings
             WHERE caretaker_id = ? AND id != ? AND status IN ('ACCEPTED', 'CONFIRMED', 'ACTIVE')
               AND start_date < ? AND end_date > ?`,
            [userId, booking.id, booking.end_date, booking.start_date]
          );
          if (overlaps.length > 0) {
            throw new AppError('Cannot accept: dates overlap with another confirmed contract.', 409);
          }
        }
      } else if (role === 'PARENT') {
        if (booking.parent_id !== userId) throw new AppError('Unauthorized.', 403);
        if (status === 'CONFIRMED' && booking.status !== 'ACCEPTED') {
          throw new AppError('Booking must be accepted by the caretaker before confirmation.', 400);
        }
        if (!['CONFIRMED', 'CANCELLED'].includes(status)) {
          throw new AppError('Invalid status update for parent.', 400);
        }
      }

      await conn.execute(
        'UPDATE bookings SET status = ?, cancellation_reason = ? WHERE id = ?',
        [status, status === 'CANCELLED' || status === 'REJECTED' ? reason || null : booking.cancellation_reason, booking.id]
      );

      const notifyUserId = role === 'CARETAKER' ? booking.parent_id : booking.caretaker_id;
      await createNotification(
        {
          userId: notifyUserId,
          type: `BOOKING_${status}`,
          title: `Contract ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          message: `Booking #${booking.id.slice(0, 8)} is now ${status}.`,
          referenceId: booking.id,
        },
        conn
      );
    });

    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
});

// Submit a review for a CONFIRMED/ACTIVE/COMPLETED contract
router.post('/:id/review', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, comment } = z
      .object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().min(5).max(1000),
      })
      .parse(req.body);

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT id, parent_id, caretaker_id, status FROM bookings WHERE id = ?`,
        [req.params.id]
      );
      const b = rows[0];
      if (!b || b.parent_id !== req.user!.sub) throw new AppError('Booking not found.', 404);
      if (!['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(b.status)) {
        throw new AppError('Reviews can only be submitted for confirmed or completed contracts.', 400);
      }

      await conn.execute(
        'INSERT INTO reviews (id, booking_id, parent_id, caretaker_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), b.id, b.parent_id, b.caretaker_id, rating, comment.trim()]
      );

      await conn.execute(
        `UPDATE caretaker_profiles
         SET total_reviews = total_reviews + 1,
             avg_rating = (SELECT AVG(rating) FROM reviews WHERE caretaker_id = ?)
         WHERE user_id = ?`,
        [b.caretaker_id, b.caretaker_id]
      );
    });

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
