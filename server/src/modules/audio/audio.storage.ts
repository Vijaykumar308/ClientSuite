import path from 'path';
import { promises as fs } from 'fs';
import { AppError } from '../../middlewares/errorHandler';
import { env } from '../../config/env';

export const resolveAudioStoragePath = (storedPath: string): string => {
  const root = path.resolve(env.UPLOAD_DIR);
  const resolvedPath = path.resolve(root, storedPath);
  const relativePath = path.relative(root, resolvedPath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new AppError('The stored audio file path is invalid.', 500);
  }
  return resolvedPath;
};

export const removeAudioFileIfPresent = async (filePath: string): Promise<void> => {
  try {
    await fs.rm(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};
