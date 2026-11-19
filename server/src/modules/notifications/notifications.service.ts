import { PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/db';

export async function createNotification(
  params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    referenceId?: string | null;
  },
  conn?: PoolConnection
) {
  const executor = conn ?? pool;
  await executor.execute(
    `INSERT INTO notifications (id, user_id, type, title, message, reference_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), params.userId, params.type, params.title, params.message, params.referenceId ?? null]
  );
}
