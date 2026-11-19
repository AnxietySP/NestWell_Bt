import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';
import { pool, withTransaction } from '../../config/db';
import { env } from '../../config/env';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateOpaqueToken,
  hashToken,
  Role,
} from '../../utils/security.utils';
import { AppError } from '../../middlewares/error.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { uploadRegistration, uploadAvatar } from '../../middlewares/upload.middleware';
import { createNotification } from '../notifications/notifications.service';

const router = Router();

const parentRegisterSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(191),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72),
  dzongkhag: z.string().min(2).max(80),
  address: z.string().min(3).max(255),
});

const caretakerRegisterSchema = parentRegisterSchema.extend({
  yearsExperience: z.coerce.number().int().min(0).max(50),
  qualifications: z.string().min(3).max(255),
  skills: z.string().min(2), // JSON array or comma-separated string
  languages: z.string().optional(),
  monthlyRateBtn: z.coerce.number().min(3000).max(200000),
  dailyRateBtn: z.coerce.number().min(200).max(20000).optional(),
  hourlyRateBtn: z.coerce.number().min(50).max(5000).optional(),
  bio: z.string().max(1500).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(72),
});

function setRefreshCookie(res: Response, rawToken: string, rememberMe = true) {
  const maxAge = rememberMe ? env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('nestwell_refresh', rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/api/auth',
  });
}

async function issueSessionTokens(user: { id: string; role: Role; email: string }, res: Response, rememberMe = true) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const rawRefresh = generateOpaqueToken();
  const tokenHash = hashToken(rawRefresh);
  const days = rememberMe ? env.JWT_REFRESH_EXPIRES_DAYS : 1;

  await pool.execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [uuidv4(), user.id, tokenHash, days]
  );

  setRefreshCookie(res, rawRefresh, rememberMe);
  return accessToken;
}

router.post('/register/parent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = parentRegisterSchema.parse(req.body);
    const normalizedEmail = data.email.trim().toLowerCase();

    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );
    if (existing.length > 0) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(data.password);
    const verifyToken = generateOpaqueToken();

    await withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO users (id, full_name, email, phone, password_hash, role, email_verification_token, dzongkhag, address)
         VALUES (?, ?, ?, ?, ?, 'PARENT', ?, ?, ?)`,
        [userId, data.fullName.trim(), normalizedEmail, data.phone.trim(), passwordHash, verifyToken, data.dzongkhag, data.address.trim()]
      );

      await createNotification(
        {
          userId,
          type: 'REGISTRATION_SUCCESS',
          title: 'Welcome to NestWell.BT',
          message: 'Your parent account is ready. Add your child profile to begin booking verified caretakers.',
        },
        conn
      );
    });

    const accessToken = await issueSessionTokens({ id: userId, role: 'PARENT', email: normalizedEmail }, res, true);

    res.status(201).json({
      accessToken,
      verificationTokenPreview: env.NODE_ENV !== 'production' ? verifyToken : undefined,
      user: {
        id: userId,
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        role: 'PARENT',
        isEmailVerified: false,
        dzongkhag: data.dzongkhag,
        address: data.address.trim(),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/register/caretaker',
  uploadRegistration.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = caretakerRegisterSchema.parse(req.body);
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const idDoc = files?.idDocument?.[0];
      const avatar = files?.avatar?.[0];

      if (!idDoc) {
        throw new AppError('Citizenship ID / Identification document upload is required.', 400);
      }

      const normalizedEmail = data.email.trim().toLowerCase();
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [normalizedEmail]
      );
      if (existing.length > 0) {
        throw new AppError('An account with this email address already exists.', 409);
      }

      const skillsArray = data.skills.startsWith('[')
        ? JSON.parse(data.skills)
        : data.skills.split(',').map((s) => s.trim()).filter(Boolean);

      const languagesArray = data.languages
        ? data.languages.startsWith('[')
          ? JSON.parse(data.languages)
          : data.languages.split(',').map((l) => l.trim()).filter(Boolean)
        : ['Dzongkha', 'English'];

      const userId = uuidv4();
      const passwordHash = await hashPassword(data.password);
      const verifyToken = generateOpaqueToken();
      const avatarUrl = avatar ? `/images/avatars/${avatar.filename}` : null;

      await withTransaction(async (conn) => {
        await conn.execute(
          `INSERT INTO users (id, full_name, email, phone, password_hash, role, email_verification_token, avatar_url, dzongkhag, address)
           VALUES (?, ?, ?, ?, ?, 'CARETAKER', ?, ?, ?, ?)`,
          [
            userId,
            data.fullName.trim(),
            normalizedEmail,
            data.phone.trim(),
            passwordHash,
            verifyToken,
            avatarUrl,
            data.dzongkhag,
            data.address.trim(),
          ]
        );

        await conn.execute(
          `INSERT INTO caretaker_profiles (
            user_id, bio, years_experience, qualifications, skills_json, languages_json,
            hourly_rate_btn, daily_rate_btn, monthly_rate_btn, verification_status, id_document_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
          [
            userId,
            data.bio?.trim() || null,
            data.yearsExperience,
            data.qualifications.trim(),
            JSON.stringify(skillsArray),
            JSON.stringify(languagesArray),
            data.hourlyRateBtn ?? null,
            data.dailyRateBtn ?? null,
            data.monthlyRateBtn,
            `uploads/${idDoc.filename}`,
          ]
        );

        await createNotification(
          {
            userId,
            type: 'REGISTRATION_SUCCESS',
            title: 'Application Submitted for Verification',
            message: 'Thank you for joining NestWell.BT. Our team is reviewing your Citizenship ID and qualifications.',
          },
          conn
        );
      });

      const accessToken = await issueSessionTokens({ id: userId, role: 'CARETAKER', email: normalizedEmail }, res, true);

      res.status(201).json({
        accessToken,
        user: {
          id: userId,
          fullName: data.fullName.trim(),
          email: normalizedEmail,
          phone: data.phone.trim(),
          role: 'CARETAKER',
          isEmailVerified: false,
          avatarUrl,
          dzongkhag: data.dzongkhag,
          address: data.address.trim(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, rememberMe } = loginSchema.parse(req.body);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, full_name, email, phone, password_hash, role, is_email_verified, avatar_url, dzongkhag, address, is_active
       FROM users WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new AppError('Invalid email or password.', 401);
    }
    if (!user.is_active) {
      throw new AppError('This account has been suspended. Please contact NestWell.BT support.', 403);
    }

    const accessToken = await issueSessionTokens(
      { id: user.id, role: user.role, email: user.email },
      res,
      rememberMe ?? true
    );

    res.json({
      accessToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: Boolean(user.is_email_verified),
        avatarUrl: user.avatar_url,
        dzongkhag: user.dzongkhag,
        address: user.address,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\s+/g, '');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, phone, is_active FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    const user = rows[0];
    if (!user) {
      throw new AppError('No account found with that email address.', 404);
    }
    if (!user.is_active) {
      throw new AppError('This account is suspended. Please contact NestWell.BT support.', 403);
    }

    const storedCleanPhone = String(user.phone || '').replace(/\s+/g, '');
    if (storedCleanPhone !== cleanPhone) {
      throw new AppError('The registered phone number does not match this account.', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await withTransaction(async (conn) => {
      await conn.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
        passwordHash,
        user.id,
      ]);
      await conn.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?', [
        user.id,
      ]);
      await createNotification(
        {
          userId: user.id,
          type: 'PASSWORD_RESET',
          title: 'Password Updated',
          message: 'Your NestWell.BT account password was reset successfully.',
        },
        conn
      );
    });

    res.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefresh = req.cookies?.nestwell_refresh;
    if (!rawRefresh) {
      throw new AppError('No active session.', 401);
    }

    const tokenHash = hashToken(rawRefresh);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT rt.id AS tokenId, u.id, u.full_name, u.email, u.phone, u.role, u.is_email_verified, u.avatar_url, u.dzongkhag, u.address, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ? AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    const record = rows[0];
    if (!record || !record.is_active) {
      throw new AppError('Session expired. Please log in again.', 401);
    }

    // Rotate refresh token
    await pool.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?', [record.tokenId]);
    const accessToken = await issueSessionTokens(
      { id: record.id, role: record.role, email: record.email },
      res,
      true
    );

    res.json({
      accessToken,
      user: {
        id: record.id,
        fullName: record.full_name,
        email: record.email,
        phone: record.phone,
        role: record.role,
        isEmailVerified: Boolean(record.is_email_verified),
        avatarUrl: record.avatar_url,
        dzongkhag: record.dzongkhag,
        address: record.address,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const rawRefresh = req.cookies?.nestwell_refresh;
  if (rawRefresh) {
    await pool.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [
      hashToken(rawRefresh),
    ]);
  }
  res.clearCookie('nestwell_refresh', { path: '/api/auth' });
  res.json({ success: true });
});

router.post('/verify-email', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.execute('UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL WHERE id = ?', [
      req.user!.sub,
    ]);
    await createNotification({
      userId: req.user!.sub,
      type: 'EMAIL_VERIFIED',
      title: 'Email Verified',
      message: 'Your email address has been verified.',
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, full_name AS fullName, email, phone, role, is_email_verified AS isEmailVerified,
              avatar_url AS avatarUrl, dzongkhag, address
       FROM users WHERE id = ?`,
      [req.user!.sub]
    );
    if (!rows[0]) throw new AppError('User not found.', 404);
    res.json({ user: { ...rows[0], isEmailVerified: Boolean(rows[0].isEmailVerified) } });
  } catch (err) {
    next(err);
  }
});

router.patch('/me/avatar', authenticate, uploadAvatar.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Please choose an image.', 400);
    const avatarUrl = `/images/avatars/${req.file.filename}`;
    await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user!.sub]);
    res.json({ avatarUrl });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/avatar', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.execute('UPDATE users SET avatar_url = NULL WHERE id = ?', [req.user!.sub]);
    res.json({ success: true, avatarUrl: null });
  } catch (err) {
    next(err);
  }
});

export default router;