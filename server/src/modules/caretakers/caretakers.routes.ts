import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';

const router = Router();

// Public discovery endpoint — returns APPROVED caretakers with CID & Certificate paths
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dzongkhag, minExp, maxMonthlyRate, search } = req.query;
    const conditions: string[] = [
      "u.role = 'CARETAKER'",
      'u.is_active = TRUE',
      "cp.verification_status = 'APPROVED'",
    ];
    const params: any[] = [];

    if (dzongkhag && typeof dzongkhag === 'string' && dzongkhag !== 'ALL') {
      conditions.push('u.dzongkhag = ?');
      params.push(dzongkhag);
    }
    if (minExp && !Number.isNaN(Number(minExp))) {
      conditions.push('cp.years_experience >= ?');
      params.push(Number(minExp));
    }
    if (maxMonthlyRate && !Number.isNaN(Number(maxMonthlyRate))) {
      conditions.push('cp.monthly_rate_btn <= ?');
      params.push(Number(maxMonthlyRate));
    }
    if (search && typeof search === 'string' && search.trim()) {
      conditions.push('(u.full_name LIKE ? OR cp.qualifications LIKE ? OR cp.bio LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id, u.full_name AS fullName, u.avatar_url AS avatarUrl, u.dzongkhag, u.address,
        cp.bio, cp.years_experience AS yearsExperience, cp.qualifications,
        cp.skills_json AS skills, cp.languages_json AS languages,
        cp.hourly_rate_btn AS hourlyRateBtn, cp.daily_rate_btn AS dailyRateBtn,
        cp.monthly_rate_btn AS monthlyRateBtn, cp.verification_status AS verificationStatus,
        cp.id_document_path AS idDocumentPath,
        cp.certificate_document_path AS certificateDocumentPath,
        cp.is_available AS isAvailable, cp.avg_rating AS avgRating, cp.total_reviews AS totalReviews
       FROM users u
       JOIN caretaker_profiles cp ON cp.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cp.avg_rating DESC, cp.years_experience DESC`,
      params
    );

    const formatted = rows.map((r) => ({
      ...r,
      skills: typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills,
      languages: typeof r.languages === 'string' ? JSON.parse(r.languages) : r.languages,
      monthlyRateBtn: Number(r.monthlyRateBtn),
      dailyRateBtn: r.dailyRateBtn ? Number(r.dailyRateBtn) : null,
      hourlyRateBtn: r.hourlyRateBtn ? Number(r.hourlyRateBtn) : null,
      avgRating: Number(r.avgRating),
      isAvailable: Boolean(r.isAvailable),
    }));

    res.json({ caretakers: formatted });
  } catch (err) {
    next(err);
  }
});

// Caretaker's own full profile
router.get(
  '/me/profile',
  authenticate,
  authorize('CARETAKER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          u.id, u.full_name AS fullName, u.email, u.phone, u.avatar_url AS avatarUrl, u.dzongkhag, u.address,
          cp.bio, cp.years_experience AS yearsExperience, cp.qualifications,
          cp.skills_json AS skills, cp.languages_json AS languages,
          cp.hourly_rate_btn AS hourlyRateBtn, cp.daily_rate_btn AS dailyRateBtn,
          cp.monthly_rate_btn AS monthlyRateBtn, cp.verification_status AS verificationStatus,
          cp.id_document_path AS idDocumentPath,
          cp.certificate_document_path AS certificateDocumentPath,
          cp.rejection_reason AS rejectionReason, cp.is_available AS isAvailable,
          cp.avg_rating AS avgRating, cp.total_reviews AS totalReviews
         FROM users u
         JOIN caretaker_profiles cp ON cp.user_id = u.id
         WHERE u.id = ?`,
        [req.user!.sub]
      );
      if (!rows[0]) throw new AppError('Caretaker profile not found.', 404);
      const p = rows[0];
      res.json({
        profile: {
          ...p,
          skills: typeof p.skills === 'string' ? JSON.parse(p.skills) : p.skills,
          languages: typeof p.languages === 'string' ? JSON.parse(p.languages) : p.languages,
          monthlyRateBtn: Number(p.monthlyRateBtn),
          avgRating: Number(p.avgRating),
          isAvailable: Boolean(p.isAvailable),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

const updateProfileSchema = z.object({
  bio: z.string().max(1500).optional(),
  yearsExperience: z.number().int().min(0).max(50),
  qualifications: z.string().min(3).max(255),
  skills: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1),
  monthlyRateBtn: z.number().min(3000).max(200000),
  dailyRateBtn: z.number().min(200).max(20000).nullable().optional(),
  hourlyRateBtn: z.number().min(50).max(5000).nullable().optional(),
  isAvailable: z.boolean(),
});

router.put(
  '/me/profile',
  authenticate,
  authorize('CARETAKER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      await pool.execute(
        `UPDATE caretaker_profiles
         SET bio = ?, years_experience = ?, qualifications = ?, skills_json = ?, languages_json = ?,
             monthly_rate_btn = ?, daily_rate_btn = ?, hourly_rate_btn = ?, is_available = ?
         WHERE user_id = ?`,
        [
          data.bio ?? null,
          data.yearsExperience,
          data.qualifications,
          JSON.stringify(data.skills),
          JSON.stringify(data.languages),
          data.monthlyRateBtn,
          data.dailyRateBtn ?? null,
          data.hourlyRateBtn ?? null,
          data.isAvailable,
          req.user!.sub,
        ]
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// Single caretaker public detail + reviews + blocked date windows
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caretakerId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : String(req.params.id);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id, u.full_name AS fullName, u.avatar_url AS avatarUrl, u.dzongkhag, u.address,
        cp.bio, cp.years_experience AS yearsExperience, cp.qualifications,
        cp.skills_json AS skills, cp.languages_json AS languages,
        cp.hourly_rate_btn AS hourlyRateBtn, cp.daily_rate_btn AS dailyRateBtn,
        cp.monthly_rate_btn AS monthlyRateBtn, cp.verification_status AS verificationStatus,
        cp.id_document_path AS idDocumentPath,
        cp.certificate_document_path AS certificateDocumentPath,
        cp.is_available AS isAvailable, cp.avg_rating AS avgRating, cp.total_reviews AS totalReviews
       FROM users u
       JOIN caretaker_profiles cp ON cp.user_id = u.id
       WHERE u.id = ? AND u.role = 'CARETAKER'`,
      [caretakerId]
    );
    if (!rows[0]) throw new AppError('Caretaker not found.', 404);

    const [reviews] = await pool.execute<RowDataPacket[]>(
      `SELECT r.id, r.rating, r.comment, r.created_at AS createdAt, u.full_name AS parentName
       FROM reviews r
       JOIN users u ON u.id = r.parent_id
       WHERE r.caretaker_id = ?
       ORDER BY r.created_at DESC`,
      [caretakerId]
    );

    const [busyWindows] = await pool.execute<RowDataPacket[]>(
      `SELECT start_date AS startDate, end_date AS endDate, status
       FROM bookings
       WHERE caretaker_id = ? AND status IN ('ACCEPTED', 'CONFIRMED', 'ACTIVE')`,
      [caretakerId]
    );

    const c = rows[0];
    res.json({
      caretaker: {
        ...c,
        skills: typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills,
        languages: typeof c.languages === 'string' ? JSON.parse(c.languages) : c.languages,
        monthlyRateBtn: Number(c.monthlyRateBtn),
        dailyRateBtn: c.dailyRateBtn ? Number(c.dailyRateBtn) : null,
        hourlyRateBtn: c.hourlyRateBtn ? Number(c.hourlyRateBtn) : null,
        avgRating: Number(c.avgRating),
        isAvailable: Boolean(c.isAvailable),
      },
      reviews,
      busyWindows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;