import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import path from 'path';
import fs from 'fs';
import { pool, withTransaction } from '../../config/db';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';
import { createNotification } from '../notifications/notifications.service';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [[userCounts]] = await pool.execute<RowDataPacket[]>(
      `SELECT
        SUM(role = 'PARENT') AS totalParents,
        SUM(role = 'CARETAKER') AS totalCaretakers
       FROM users`
    );
    const [[caretakerCounts]] = await pool.execute<RowDataPacket[]>(
      `SELECT
        SUM(verification_status = 'APPROVED') AS verifiedCaretakers,
        SUM(verification_status = 'PENDING') AS pendingVerifications
       FROM caretaker_profiles`
    );
    const [[bookingCounts]] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS totalBookings,
        SUM(status IN ('CONFIRMED', 'ACTIVE')) AS activeContracts,
        SUM(status = 'CANCELLED') AS cancelledBookings
       FROM bookings`
    );

    res.json({
      stats: {
        totalParents: Number(userCounts.totalParents || 0),
        totalCaretakers: Number(userCounts.totalCaretakers || 0),
        verifiedCaretakers: Number(caretakerCounts.verifiedCaretakers || 0),
        pendingVerifications: Number(caretakerCounts.pendingVerifications || 0),
        totalBookings: Number(bookingCounts.totalBookings || 0),
        activeContracts: Number(bookingCounts.activeContracts || 0),
        cancelledBookings: Number(bookingCounts.cancelledBookings || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/verifications', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id, u.full_name AS fullName, u.email, u.phone, u.dzongkhag, u.address, u.created_at AS createdAt,
        cp.years_experience AS yearsExperience, cp.qualifications, cp.monthly_rate_btn AS monthlyRateBtn,
        cp.verification_status AS verificationStatus, cp.id_document_path AS idDocumentPath,
        cp.rejection_reason AS rejectionReason
       FROM users u
       JOIN caretaker_profiles cp ON cp.user_id = u.id
       ORDER BY FIELD(cp.verification_status, 'PENDING', 'REJECTED', 'APPROVED'), u.created_at DESC`
    );
    res.json({ applications: rows });
  } catch (err) {
    next(err);
  }
});

// Secure administrator-only ID document retrieval
router.get('/documents/:caretakerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id_document_path FROM caretaker_profiles WHERE user_id = ?',
      [req.params.caretakerId]
    );
    if (!rows[0]) throw new AppError('Document not found.', 404);
    const fullPath = path.resolve(__dirname, '../../../', rows[0].id_document_path);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('Uploaded document file does not exist on disk.', 404);
    }
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

router.patch('/verifications/:caretakerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision, rejectionReason } = z
      .object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        rejectionReason: z.string().max(255).optional(),
      })
      .parse(req.body);

    if (decision === 'REJECTED' && !rejectionReason?.trim()) {
      throw new AppError('Please provide a clear reason when rejecting a verification request.', 400);
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE caretaker_profiles
         SET verification_status = ?, rejection_reason = ?, verified_by = ?, verified_at = NOW()
         WHERE user_id = ?`,
        [decision, decision === 'REJECTED' ? rejectionReason!.trim() : null, req.user!.sub, req.params.caretakerId]
      );

      await createNotification(
        {
          userId: req.params.caretakerId,
          type: 'CARETAKER_VERIFICATION',
          title: decision === 'APPROVED' ? 'Profile Verified!' : 'Verification Update Required',
          message:
            decision === 'APPROVED'
              ? 'Congratulations! Your profile is now verified and visible to families across Bhutan.'
              : `Your verification was not approved: ${rejectionReason}`,
        },
        conn
      );
    });

    res.json({ success: true, decision });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, full_name AS fullName, email, phone, role, dzongkhag, is_active AS isActive, created_at AS createdAt
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: rows.map((u) => ({ ...u, isActive: Boolean(u.isActive) })) });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/toggle-active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.sub) {
      throw new AppError('Administrators cannot deactivate their own account.', 400);
    }
    await pool.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
