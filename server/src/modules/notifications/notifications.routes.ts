import { Router, Request, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, type, title, message, reference_id AS referenceId, is_read AS isRead, created_at AS createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 40`,
      [req.user!.sub]
    );
    res.json({ notifications: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user!.sub]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
      [req.user!.sub]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
