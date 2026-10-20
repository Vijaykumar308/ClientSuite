import path from 'path';
import { parseFile, TrackType } from 'music-metadata';
import { AppError } from '../../middlewares/errorHandler';
import { env } from '../../config/env';

export interface ValidatedAudioFile {
  fileName: string;
  title: string;
  extension: '.mp3' | '.wav';
  mimeType: 'audio/mpeg' | 'audio/wav';
  durationSeconds: number;
}

const maximumFileSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

if (!Number.isSafeInteger(maximumFileSizeBytes) || maximumFileSizeBytes <= 0) {
  throw new Error('MAX_FILE_SIZE_MB must be a positive, safe integer.');
}

export const audioUploadLimitBytes = maximumFileSizeBytes;

export const safeOriginalFileName = (originalName: string): string => {
  const baseName = originalName.replace(/\\/g, '/').split('/').pop() ?? '';
  const safeName = baseName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return safeName.slice(0, 255);
};

export const validateAudioFile = async (
  filePath: string,
  originalName: string,
  fileSizeBytes: number
): Promise<ValidatedAudioFile> => {
  if (fileSizeBytes <= 0) {
    throw new AppError('The selected audio file is empty.', 400);
  }
  if (fileSizeBytes > maximumFileSizeBytes) {
    throw new AppError(`Audio files must be ${env.MAX_FILE_SIZE_MB} MB or smaller.`, 413);
  }

  const fileName = safeOriginalFileName(originalName);
  const extension = path.extname(fileName).toLowerCase();
  if (extension !== '.mp3' && extension !== '.wav') {
    throw new AppError('Only MP3 and WAV audio files are supported.', 400);
  }

  let metadata;
  try {
    metadata = await parseFile(filePath, {
      duration: true,
      skipCovers: true,
      maxMemoryAllocation: 8 * 1024 * 1024,
    });
  } catch {
    throw new AppError('The uploaded file is not a valid MP3 or WAV audio file.', 400);
  }

  const container = metadata.format.container?.toUpperCase();
  const expectedContainer = extension === '.wav' ? 'WAVE' : 'MPEG';
  const hasAudio = metadata.format.hasAudio === true
    || metadata.format.trackInfo.some((track) => track.type === TrackType.audio);
  const durationSeconds = metadata.format.duration;

  if (container !== expectedContainer || !hasAudio) {
    throw new AppError('The file content does not match a supported MP3 or WAV audio file.', 400);
  }
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new AppError('The audio duration could not be read from this file.', 400);
  }

  const title = path.basename(fileName, extension).trim().slice(0, 120);
  if (!title) throw new AppError('The audio file must have a name.', 400);

  return {
    fileName,
    title,
    extension,
    mimeType: extension === '.wav' ? 'audio/wav' : 'audio/mpeg',
    durationSeconds,
  };
};
