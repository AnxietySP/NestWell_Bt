import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

const childSchema = z.object({
  fullName: z.string().min(2).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allergies: z.string().max(255).optional(),
  medicalNotes: z.string().max(1000).optional(),
  specialInstructions: z.string().max(1000).optional(),
});

router.get('/children', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, full_name AS fullName, date_of_birth AS dateOfBirth, allergies,
              medical_notes AS medicalNotes, special_instructions AS specialInstructions
       FROM children WHERE parent_id = ? ORDER BY created_at DESC`,
      [req.user!.sub]
    );
    res.json({ children: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/children', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = childSchema.parse(req.body);
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO children (id, parent_id, full_name, date_of_birth, allergies, medical_notes, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user!.sub, data.fullName.trim(), data.dateOfBirth, data.allergies || null, data.medicalNotes || null, data.specialInstructions || null]
    );
    res.status(201).json({ id, ...data });
  } catch (err) {
    next(err);
  }
});

router.delete('/children/:id', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.execute('DELETE FROM children WHERE id = ? AND parent_id = ?', [req.params.id, req.user!.sub]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/favorites', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT caretaker_id AS caretakerId FROM favorite_caretakers WHERE parent_id = ?',
      [req.user!.sub]
    );
    res.json({ favoriteIds: rows.map((r) => r.caretakerId) });
  } catch (err) {
    next(err);
  }
});

router.post('/favorites/:caretakerId', authenticate, authorize('PARENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM favorite_caretakers WHERE parent_id = ? AND caretaker_id = ?',
      [req.user!.sub, req.params.caretakerId]
    );
    if (existing.length > 0) {
      await pool.execute('DELETE FROM favorite_caretakers WHERE parent_id = ? AND caretaker_id = ?', [
        req.user!.sub,
        req.params.caretakerId,
      ]);
      res.json({ favorited: false });
    } else {
      await pool.execute('INSERT INTO favorite_caretakers (parent_id, caretaker_id) VALUES (?, ?)', [
        req.user!.sub,
        req.params.caretakerId,
      ]);
      res.json({ favorited: true });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
