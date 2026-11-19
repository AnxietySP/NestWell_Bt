import app from './app';
import { env } from './config/env';
import { pool } from './config/db';

async function bootstrap() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('MySQL connection pool established.');

    app.listen(env.PORT, () => {
      console.log(`NestWell.BT API listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
