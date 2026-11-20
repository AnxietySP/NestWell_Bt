import fs from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { AppError } from '../../middlewares/error.middleware';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { createNotification } from '../notifications/notifications.service';

const router = Router();

const verifySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional(),
});

async function getProfileJoinConfig() {
  const [cols] = await pool.execute<RowDataPacket[]>('SHOW COLUMNS FROM caretaker_profiles');
  const names = new Set(cols.map((c) => String(c.Field)));
  const fkCol = names.has('user_id') ? 'user_id' : names.has('caretaker_id') ? 'caretaker_id' : 'id';
  const docCol = names.has('id_document_path')
    ? 'id_document_path'
    : names.has('id_document_url')
    ? 'id_document_url'
    : names.has('cid_document_path')
    ? 'cid_document_path'
    : null;
  const certCol = names.has('certificate_document_path')
    ? 'certificate_document_path'
    : names.has('certificate_document_url')
    ? 'certificate_document_url'
    : names.has('certificate_path')
    ? 'certificate_path'
    : null;
  const hasVerifiedBy = names.has('verified_by');
  const hasVerifiedAt = names.has('verified_at');
  return { fkCol, docCol, certCol, hasVerifiedBy, hasVerifiedAt };
}

function tryDeleteUploadedFile(storedPath?: string | null) {
  if (!storedPath) return;
  const normalized = storedPath.replace(/\\/g, '/').replace(/^https?:\/\/[^/]+\//i, '').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return;

  const candidates = [
    path.resolve(process.cwd(), normalized),
    path.resolve(process.cwd(), 'uploads', path.basename(normalized)),
    path.resolve(__dirname, '../../../', normalized),
    path.resolve(__dirname, '../../../uploads', path.basename(normalized)),
  ];

  for (const filePath of Array.from(new Set(candidates))) {
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore file unlink errors so DB deletion always completes
    }
  }
}

// Get platform KPI stats
router.get('/stats', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { fkCol } = await getProfileJoinConfig();

    const [[parentRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'PARENT'`
    );
    const [[caretakerRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'CARETAKER'`
    );
    const [[verifiedRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM users u
       JOIN caretaker_profiles cp ON cp.${fkCol} = u.id
       WHERE u.role = 'CARETAKER' AND cp.verification_status = 'APPROVED'`
    );
    const [[pendingRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM users u
       LEFT JOIN caretaker_profiles cp ON cp.${fkCol} = u.id
       WHERE u.role = 'CARETAKER' AND COALESCE(cp.verification_status, 'PENDING') = 'PENDING'`
    );
    const [[contractsRow]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM bookings WHERE status IN ('ACCEPTED', 'CONFIRMED', 'ACTIVE')`
    );

    res.json({
      stats: {
        totalParents: Number(parentRow?.count || 0),
        totalCaretakers: Number(caretakerRow?.count || 0),
        verifiedCaretakers: Number(verifiedRow?.count || 0),
        pendingVerifications: Number(pendingRow?.count || 0),
        activeContracts: Number(contractsRow?.count || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get all caretakers with their caretaker_profiles, CID, and Institution Certificate paths
router.get('/caretakers', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { fkCol, docCol, certCol } = await getProfileJoinConfig();
    const docSelect = docCol ? `cp.${docCol} AS idDocumentPath,` : `NULL AS idDocumentPath,`;
    const certSelect = certCol ? `cp.${certCol} AS certificateDocumentPath,` : `NULL AS certificateDocumentPath,`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id,
              u.full_name AS fullName,
              u.email,
              u.phone,
              u.dzongkhag,
              u.address,
              u.avatar_url AS avatarUrl,
              u.is_active AS isActive,
              u.created_at AS createdAt,
              COALESCE(cp.years_experience, 0) AS yearsExperience,
              COALESCE(cp.qualifications, 'Not specified') AS qualifications,
              COALESCE(cp.monthly_rate_btn, 0) AS monthlyRateBtn,
              COALESCE(cp.verification_status, 'PENDING') AS verificationStatus,
              ${docSelect}
              ${certSelect}
              cp.rejection_reason AS rejectionReason
       FROM users u
       LEFT JOIN caretaker_profiles cp ON cp.${fkCol} = u.id
       WHERE u.role = 'CARETAKER'
       ORDER BY FIELD(COALESCE(cp.verification_status, 'PENDING'), 'PENDING', 'REJECTED', 'APPROVED'), u.created_at DESC`
    );

    res.json({ caretakers: rows });
  } catch (err) {
    next(err);
  }
});

// Approve or Reject caretaker CID & institution certificate
router.patch('/caretakers/:id/verify', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caretakerId = String(req.params.id);
    const { status, rejectionReason } = verifySchema.parse(req.body);
    const { fkCol, hasVerifiedBy, hasVerifiedAt } = await getProfileJoinConfig();

    const [users] = await pool.execute<RowDataPacket[]>(
      `SELECT id, full_name FROM users WHERE id = ? AND role = 'CARETAKER'`,
      [caretakerId]
    );
    if (!users[0]) {
      throw new AppError('Caretaker account not found.', 404);
    }

    const [existingProfile] = await pool.execute<RowDataPacket[]>(
      `SELECT ${fkCol} FROM caretaker_profiles WHERE ${fkCol} = ?`,
      [caretakerId]
    );

    if (existingProfile.length === 0) {
      await pool.execute(
        `INSERT INTO caretaker_profiles (${fkCol}, verification_status, rejection_reason)
         VALUES (?, ?, ?)`,
        [caretakerId, status, status === 'REJECTED' ? rejectionReason || null : null]
      );
    } else {
      const extraSets = [
        hasVerifiedBy ? ', verified_by = ?' : '',
        hasVerifiedAt ? ', verified_at = NOW()' : '',
      ].join('');
      const params: any[] = [
        status,
        status === 'REJECTED' ? rejectionReason || null : null,
      ];
      if (hasVerifiedBy) params.push(req.user!.sub);
      params.push(caretakerId);

      await pool.execute(
        `UPDATE caretaker_profiles
         SET verification_status = ?,
             rejection_reason = ?${extraSets}
         WHERE ${fkCol} = ?`,
        params
      );
    }

    await createNotification({
      userId: caretakerId,
      type: status === 'APPROVED' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
      title: status === 'APPROVED' ? 'Profile, CID & Certificate Verified' : 'Verification Update Required',
      message:
        status === 'APPROVED'
          ? 'Your Citizenship ID and institution certificate have been approved. Your profile is now live for parent bookings.'
          : `Your verification was not approved${rejectionReason ? `: ${rejectionReason}` : '.'}`,
    });

    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
});

// Delete a caretaker account & associated records/files
router.delete('/caretakers/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caretakerId = String(req.params.id);
    const { fkCol, docCol, certCol } = await getProfileJoinConfig();

    const docSelect = docCol ? `, cp.${docCol} AS idDocumentPath` : '';
    const certSelect = certCol ? `, cp.${certCol} AS certificateDocumentPath` : '';
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.avatar_url AS avatarUrl${docSelect}${certSelect}
       FROM users u
       LEFT JOIN caretaker_profiles cp ON cp.${fkCol} = u.id
       WHERE u.id = ? AND u.role = 'CARETAKER'`,
      [caretakerId]
    );

    const target = rows[0];
    if (!target) {
      throw new AppError('Caretaker account not found.', 404);
    }

    // Delete dependent records safely in case ON DELETE CASCADE is not set on all FKs
    await pool.execute(`DELETE FROM notifications WHERE user_id = ?`, [caretakerId]);
    await pool.execute(`DELETE FROM bookings WHERE caretaker_id = ?`, [caretakerId]);
    await pool.execute(`DELETE FROM caretaker_profiles WHERE ${fkCol} = ?`, [caretakerId]);
    await pool.execute(`DELETE FROM users WHERE id = ? AND role = 'CARETAKER'`, [caretakerId]);

    tryDeleteUploadedFile(target.avatarUrl);
    if (docCol) {
      tryDeleteUploadedFile(target.idDocumentPath);
    }
    if (certCol) {
      tryDeleteUploadedFile(target.certificateDocumentPath);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Get all bookings/contracts for admin audit
router.get('/bookings', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id,
              b.start_date AS startDate,
              b.end_date AS endDate,
              b.duration_months AS durationMonths,
              b.agreed_monthly_rate_btn AS agreedMonthlyRateBtn,
              b.estimated_total_btn AS estimatedTotalBtn,
              b.status,
              b.created_at AS createdAt,
              p.full_name AS parentName,
              c.full_name AS caretakerName,
              ch.full_name AS childName
       FROM bookings b
       JOIN users p ON p.id = b.parent_id
       JOIN users c ON c.id = b.caretaker_id
       LEFT JOIN child_profiles ch ON ch.id = b.child_id
       ORDER BY b.created_at DESC`
    );

    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

// Delete a booking/contract record
router.delete('/bookings/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookingId = String(req.params.id);
    await pool.execute(`DELETE FROM bookings WHERE id = ?`, [bookingId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;