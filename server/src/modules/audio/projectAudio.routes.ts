import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';
import { prisma } from '../../shared/prisma';
import { parseAudioByteRange } from './audio.http';
import { removeAudioFileIfPresent, resolveAudioStoragePath } from './audio.storage';
import { audioUploadLimitBytes, validateAudioFile } from './audio.validation';

export const projectAudioRouter = Router();

interface AudioProjectContext {
  id: string;
  tenantId: string;
}

const projectAccess: RequestHandler = async (req, res, next) => {
  try {
    const tenantId = res.locals.authUser?.tenantId;
    if (typeof tenantId !== 'string' || !tenantId) {
      throw new AppError('An authenticated studio workspace is required.', 401);
    }
    const projectId = z.string().uuid().parse(req.params.projectId);
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, tenantId: true },
    });
    if (!project) throw new AppError('Project not found in this workspace.', 404);
    res.locals.audioProject = project;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid project identifier.', 400));
      return;
    }
    next(error);
  }
};

const getAudioProject = (res: Response): AudioProjectContext => {
  const value: unknown = res.locals.audioProject;
  if (
    !value
    || typeof value !== 'object'
    || !('id' in value)
    || !('tenantId' in value)
    || typeof value.id !== 'string'
    || typeof value.tenantId !== 'string'
  ) {
    throw new AppError('An authorized project is required for this audio operation.', 500);
  }
  return { id: value.id, tenantId: value.tenantId };
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const temporaryDirectory = path.join(path.resolve(env.UPLOAD_DIR), '.tmp');
      void fs.mkdir(temporaryDirectory, { recursive: true, mode: 0o700 })
        .then(() => callback(null, temporaryDirectory))
        .catch((error: NodeJS.ErrnoException) => callback(error, temporaryDirectory));
    },
    filename: (_req, _file, callback) => callback(null, `${randomUUID()}.upload`),
  }),
  limits: { fileSize: audioUploadLimitBytes, files: 1, fields: 0 },
}).single('audio');

const parseAudioUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(`Audio files must be ${env.MAX_FILE_SIZE_MB} MB or smaller.`, 413));
        return;
      }
      next(new AppError('Upload one audio file at a time.', 400));
      return;
    }
    next(error);
  });
};

const getUploadedFile = (req: Request): NonNullable<Request['file']> => {
  if (!req.file) throw new AppError('Choose an MP3 or WAV file to upload.', 400);
  return req.file;
};

const makeStorageKey = (
  tenantId: string,
  projectId: string,
  trackId: string,
  assetId: string,
  extension: string
): string => [tenantId, projectId, trackId, `${assetId}${extension}`].join('/');

const cleanupFailedUpload = async (
  temporaryPath: string | undefined,
  storedPath: string | undefined
): Promise<void> => {
  try {
    if (temporaryPath) await removeAudioFileIfPresent(temporaryPath);
    if (storedPath) await removeAudioFileIfPresent(storedPath);
  } catch (cleanupError) {
    console.error('[Audio upload] Failed to clean up an incomplete upload.', cleanupError);
    throw new AppError('The upload failed and temporary audio could not be removed. Contact support.', 500);
  }
};

const getPublicVersion = (version: {
  id: string;
  versionNumber: number;
  fileName: string;
  durationSeconds: number | null;
  fileSizeBytes: bigint | null;
  mimeType: string | null;
  status: string;
  isActiveVersion: boolean;
  createdAt: Date;
}) => ({
  id: version.id,
  versionNumber: version.versionNumber,
  fileName: version.fileName,
  durationSeconds: version.durationSeconds,
  fileSizeBytes: version.fileSizeBytes?.toString() ?? null,
  mimeType: version.mimeType,
  status: version.status,
  isActiveVersion: version.isActiveVersion,
  createdAt: version.createdAt,
});

projectAudioRouter.use('/:projectId/audio-tracks', projectAccess);

projectAudioRouter.get('/:projectId/audio-tracks', async (_req, res, next) => {
  try {
    const project = getAudioProject(res);
    const tracks = await prisma.projectAudioTrack.findMany({
      where: { tenantId: project.tenantId, projectId: project.id },
      orderBy: { createdAt: 'asc' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            fileName: true,
            durationSeconds: true,
            fileSizeBytes: true,
            mimeType: true,
            status: true,
            isActiveVersion: true,
            createdAt: true,
          },
        },
      },
    });
    res.json({
      success: true,
      maxFileSizeBytes: audioUploadLimitBytes,
      data: tracks.map(({ versions, ...track }) => ({
        ...track,
        versions: versions.map(getPublicVersion),
      })),
    });
  } catch (error) {
    next(error);
  }
});

projectAudioRouter.post(
  '/:projectId/audio-tracks',
  parseAudioUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    const temporaryPath = req.file?.path;
    let finalPath: string | undefined;
    try {
      const project = getAudioProject(res);
      const file = getUploadedFile(req);
      await fs.chmod(file.path, 0o600);
      const validated = await validateAudioFile(file.path, file.originalname, file.size);
      const trackId = randomUUID();
      const assetId = randomUUID();
      const storageKey = makeStorageKey(
        project.tenantId,
        project.id,
        trackId,
        assetId,
        validated.extension
      );
      finalPath = resolveAudioStoragePath(storageKey);
      await fs.mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
      await fs.rename(file.path, finalPath);
      await fs.chmod(finalPath, 0o600);

      const version = await prisma.$transaction(async (transaction) => {
        await transaction.projectAudioTrack.create({
          data: {
            id: trackId,
            tenantId: project.tenantId,
            projectId: project.id,
            title: validated.title,
          },
        });
        return transaction.projectAsset.create({
          data: {
            id: assetId,
            tenantId: project.tenantId,
            projectId: project.id,
            audioTrackId: trackId,
            versionNumber: 1,
            title: validated.title,
            fileName: validated.fileName,
            originalStoragePath: storageKey,
            durationSeconds: validated.durationSeconds,
            fileSizeBytes: BigInt(file.size),
            mimeType: validated.mimeType,
            status: 'READY',
            isActiveVersion: true,
          },
          select: {
            id: true,
            versionNumber: true,
            fileName: true,
            durationSeconds: true,
            fileSizeBytes: true,
            mimeType: true,
            status: true,
            isActiveVersion: true,
            createdAt: true,
          },
        });
      });
      res.status(201).json({
        success: true,
        data: {
          id: trackId,
          title: validated.title,
          versions: [getPublicVersion(version)],
        },
      });
    } catch (error) {
      try {
        await cleanupFailedUpload(temporaryPath, finalPath);
      } catch (cleanupError) {
        next(cleanupError);
        return;
      }
      next(error);
    }
  }
);

projectAudioRouter.post(
  '/:projectId/audio-tracks/:trackId/versions',
  parseAudioUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    const temporaryPath = req.file?.path;
    let finalPath: string | undefined;
    try {
      const project = getAudioProject(res);
      const trackId = z.string().uuid().parse(req.params.trackId);
      const track = await prisma.projectAudioTrack.findFirst({
        where: { id: trackId, tenantId: project.tenantId, projectId: project.id },
        select: { id: true, title: true },
      });
      if (!track) throw new AppError('Audio track not found in this project.', 404);

      const file = getUploadedFile(req);
      await fs.chmod(file.path, 0o600);
      const validated = await validateAudioFile(file.path, file.originalname, file.size);
      if (path.extname(validated.fileName).toLowerCase() !== validated.extension) {
        throw new AppError('The selected audio file extension is invalid.', 400);
      }
      const assetId = randomUUID();
      const storageKey = makeStorageKey(
        project.tenantId,
        project.id,
        track.id,
        assetId,
        validated.extension
      );
      finalPath = resolveAudioStoragePath(storageKey);
      await fs.mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
      await fs.rename(file.path, finalPath);
      await fs.chmod(finalPath, 0o600);

      const version = await prisma.$transaction(async (transaction) => {
        const latestVersion = await transaction.projectAsset.aggregate({
          where: { audioTrackId: track.id },
          _max: { versionNumber: true },
        });
        const versionNumber = (latestVersion._max.versionNumber ?? 0) + 1;
        await transaction.projectAsset.updateMany({
          where: { audioTrackId: track.id, isActiveVersion: true },
          data: { isActiveVersion: false },
        });
        return transaction.projectAsset.create({
          data: {
            id: assetId,
            tenantId: project.tenantId,
            projectId: project.id,
            audioTrackId: track.id,
            versionNumber,
            title: track.title,
            fileName: validated.fileName,
            originalStoragePath: storageKey,
            durationSeconds: validated.durationSeconds,
            fileSizeBytes: BigInt(file.size),
            mimeType: validated.mimeType,
            status: 'READY',
            isActiveVersion: true,
          },
          select: {
            id: true,
            versionNumber: true,
            fileName: true,
            durationSeconds: true,
            fileSizeBytes: true,
            mimeType: true,
            status: true,
            isActiveVersion: true,
            createdAt: true,
          },
        });
      });
      res.status(201).json({ success: true, data: getPublicVersion(version) });
    } catch (error) {
      try {
        await cleanupFailedUpload(temporaryPath, finalPath);
      } catch (cleanupError) {
        next(cleanupError);
        return;
      }
      if (error instanceof z.ZodError) {
        next(new AppError(error.issues[0]?.message ?? 'Invalid audio track identifier.', 400));
        return;
      }
      next(error);
    }
  }
);

projectAudioRouter.get(
  '/:projectId/audio-tracks/:trackId/versions/:assetId/stream',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = getAudioProject(res);
      const trackId = z.string().uuid().parse(req.params.trackId);
      const assetId = z.string().uuid().parse(req.params.assetId);
      const asset = await prisma.projectAsset.findFirst({
        where: {
          id: assetId,
          audioTrackId: trackId,
          projectId: project.id,
          tenantId: project.tenantId,
          status: 'READY',
        },
        select: {
          fileName: true,
          originalStoragePath: true,
          fileSizeBytes: true,
          mimeType: true,
        },
      });
      if (!asset) throw new AppError('Audio file not found in this project.', 404);

      const filePath = resolveAudioStoragePath(asset.originalStoragePath);
      const file = await fs.stat(filePath);
      if (!file.isFile()) throw new AppError('The requested audio file is unavailable.', 404);
      const range = parseAudioByteRange(req.get('range'), file.size);
      if (range === false) {
        res.status(416).setHeader('Content-Range', `bytes */${file.size}`).end();
        return;
      }

      const contentType = asset.mimeType === 'audio/mpeg' || asset.mimeType === 'audio/wav'
        ? asset.mimeType
        : 'application/octet-stream';
      const downloadName = encodeURIComponent(asset.fileName).replace(/['()*]/g, (character) => (
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`
      ));
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${downloadName}`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Accept-Ranges', 'bytes');

      if (range) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
        res.setHeader('Content-Length', range.end - range.start + 1);
        createReadStream(filePath, { start: range.start, end: range.end })
          .on('error', (error: NodeJS.ErrnoException) => {
            if (res.headersSent) res.destroy(error);
            else next(error);
          })
          .pipe(res);
        return;
      }

      res.setHeader('Content-Length', file.size);
      createReadStream(filePath)
        .on('error', (error: NodeJS.ErrnoException) => {
          if (res.headersSent) res.destroy(error);
          else next(error);
        })
        .pipe(res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.issues[0]?.message ?? 'Invalid audio file identifier.', 400));
        return;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        next(new AppError('The requested audio file is unavailable.', 404));
        return;
      }
      next(error);
    }
  }
);

projectAudioRouter.delete(
  '/:projectId/audio-tracks/:trackId/versions/:assetId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = getAudioProject(res);
      const trackId = z.string().uuid().parse(req.params.trackId);
      const assetId = z.string().uuid().parse(req.params.assetId);
      const asset = await prisma.projectAsset.findFirst({
        where: {
          id: assetId,
          audioTrackId: trackId,
          projectId: project.id,
          tenantId: project.tenantId,
        },
        select: {
          id: true,
          audioTrackId: true,
          originalStoragePath: true,
          isActiveVersion: true,
        },
      });
      if (!asset) throw new AppError('Audio file not found in this project.', 404);

      const originalPath = resolveAudioStoragePath(asset.originalStoragePath);
      const stagedPath = `${originalPath}.deleting-${randomUUID()}`;
      await fs.rename(originalPath, stagedPath);
      try {
        await prisma.$transaction(async (transaction) => {
          await transaction.projectAsset.delete({ where: { id: asset.id } });
          if (asset.isActiveVersion) {
            await transaction.projectAsset.updateMany({
              where: { audioTrackId: trackId },
              data: { isActiveVersion: false },
            });
            const fallbackVersion = await transaction.projectAsset.findFirst({
              where: { audioTrackId: trackId, status: 'READY' },
              orderBy: { versionNumber: 'desc' },
              select: { id: true },
            });
            if (fallbackVersion) {
              await transaction.projectAsset.update({
                where: { id: fallbackVersion.id },
                data: { isActiveVersion: true },
              });
            } else {
              await transaction.projectAudioTrack.delete({ where: { id: trackId } });
            }
          }
        });
      } catch (databaseError) {
        try {
          await fs.rename(stagedPath, originalPath);
        } catch (restoreError) {
          console.error('[Audio delete] Failed to restore a file after database rollback.', restoreError);
          next(new AppError('Audio deletion failed and the file could not be restored. Contact support.', 500));
          return;
        }
        throw databaseError;
      }

      try {
        await removeAudioFileIfPresent(stagedPath);
      } catch (cleanupError) {
        console.error('[Audio delete] The deleted file remains in private storage.', cleanupError);
        next(new AppError('The file was removed from the project, but private storage cleanup failed.', 500));
        return;
      }
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.issues[0]?.message ?? 'Invalid audio file identifier.', 400));
        return;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        next(new AppError('The requested audio file is unavailable.', 404));
        return;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        next(new AppError('This audio file cannot be removed while it is in use.', 409));
        return;
      }
      next(error);
    }
  }
);
