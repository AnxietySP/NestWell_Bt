import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './error.middleware';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PRIVATE_DIR = path.resolve(__dirname, '../../uploads'); // ID documents (private)
const AVATAR_DIR = path.resolve(__dirname, '../../../client/public/images/avatars'); // profile photos

function randomName(originalName: string) {
  return `${uuidv4()}${path.extname(originalName).toLowerCase()}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRIVATE_DIR),
  filename: (_req, file, cb) => cb(null, randomName(file.originalname)),
});

export const uploadDocuments = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError('Only JPG, PNG, WEBP, or PDF files under 5MB are allowed.', 400));
      return;
    }
    cb(null, true);
  },
});

// Photos go to public/images/avatars, everything else stays private.
const registrationStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'avatar') {
      fs.mkdirSync(AVATAR_DIR, { recursive: true });
      cb(null, AVATAR_DIR);
    } else {
      cb(null, PRIVATE_DIR);
    }
  },
  filename: (_req, file, cb) => cb(null, randomName(file.originalname)),
});

export const uploadRegistration = multer({
  storage: registrationStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'avatar' && !IMAGE_MIME.has(file.mimetype)) {
      cb(new AppError('Profile photo must be a JPG, PNG or WEBP image.', 400));
      return;
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError('Only JPG, PNG, WEBP, or PDF files under 5MB are allowed.', 400));
      return;
    }
    cb(null, true);
  },
});

// Changing a profile photo later (images only, 2MB).
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    cb(null, AVATAR_DIR);
  },
  filename: (_req, file, cb) => cb(null, randomName(file.originalname)),
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME.has(file.mimetype)) {
      cb(new AppError('Only JPG, PNG or WEBP images under 2MB are allowed.', 400));
      return;
    }
    cb(null, true);
  },
});