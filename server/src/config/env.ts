import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;

if (
  nodeEnv === 'production' &&
  (!jwtAccessSecret || jwtAccessSecret.length < 32 || jwtAccessSecret.includes('change_in_production'))
) {
  throw new Error('Set JWT_ACCESS_SECRET to a unique secret of at least 32 characters in production.');
}

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: nodeEnv,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: jwtAccessSecret || 'dev_secret_key_change_in_production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) : 200,
  DEFAULT_PREVIEW_DURATION_SECONDS: process.env.DEFAULT_PREVIEW_DURATION_SECONDS
    ? parseInt(process.env.DEFAULT_PREVIEW_DURATION_SECONDS, 10)
    : 15,
};
