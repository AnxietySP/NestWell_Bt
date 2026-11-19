import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import caretakerRoutes from './modules/caretakers/caretakers.routes';
import parentRoutes from './modules/parents/parents.routes';
import bookingRoutes from './modules/bookings/bookings.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve uploaded Citizenship IDs and profile avatars statically
const uploadCandidates = [
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(__dirname, '../../uploads'),
  path.resolve(__dirname, '../uploads'),
  path.resolve(__dirname, 'uploads'),
];

for (const dir of Array.from(new Set(uploadCandidates))) {
  if (fs.existsSync(dir)) {
    app.use('/uploads', express.static(dir));
    // Fallback if Multer saved files into uploads/avatars or uploads/cid
    const avatarsSubdir = path.join(dir, 'avatars');
    if (fs.existsSync(avatarsSubdir)) {
      app.use('/uploads', express.static(avatarsSubdir));
    }
    const cidSubdir = path.join(dir, 'cid');
    if (fs.existsSync(cidSubdir)) {
      app.use('/uploads', express.static(cidSubdir));
    }
  }
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again shortly.' },
});

app.use('/api', apiLimiter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'NestWell.BT API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/caretakers', caretakerRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;