import { randomUUID } from 'crypto';
import { spawn, type SpawnOptions } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import ffmpegPath from 'ffmpeg-static';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';
import { prisma } from '../../shared/prisma';
import { removeAudioFileIfPresent, resolveAudioStoragePath } from './audio.storage';

export const clientPortalRouter = Router();

const maximumPreviewWindowSeconds = 20;
const tokenSchema = z.string().uuid();
const previewRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { message: 'Too many preview requests. Wait a moment and try again.' },
    });
  },
});

const getSharedProject = async (token: string) => {
  const validToken = tokenSchema.parse(token);
  const project = await prisma.project.findFirst({
    where: {
      portalToken: validToken,
      portalEnabled: true,
      OR: [
        { portalTokenExpiresAt: null },
        { portalTokenExpiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      tenant: { select: { maxPreviewSeconds: true } },
    },
  });
  if (!project) throw new AppError('This project link is unavailable or has expired.', 404);
  return project;
};

const getPreviewWindowSeconds = (maxPreviewSeconds: number): number => {
  if (!Number.isInteger(maxPreviewSeconds) || maxPreviewSeconds <= 0) {
    throw new AppError('The project preview duration is not configured correctly.', 500);
  }
  return Math.min(maximumPreviewWindowSeconds, maxPreviewSeconds);
};

const getActiveVersion = async (projectId: string, tenantId: string, trackId: string) => {
  const validTrackId = tokenSchema.parse(trackId);
  const track = await prisma.projectAudioTrack.findFirst({
    where: { id: validTrackId, projectId, tenantId },
    select: {
      id: true,
      title: true,
      versions: {
        where: { isActiveVersion: true, status: 'READY' },
        take: 1,
        select: {
          id: true,
          fileName: true,
          durationSeconds: true,
          originalStoragePath: true,
        },
      },
    },
  });
  const version = track?.versions[0];
  if (!track || !version || !version.durationSeconds || version.durationSeconds <= 0) {
    throw new AppError('The current audio version is unavailable.', 404);
  }
  return { track, version };
};

const createPreviewClip = async (
  sourcePath: string,
  outputPath: string,
  startSeconds: number,
  durationSeconds: number
): Promise<void> => {
  const binaryPath = ffmpegPath;
  if (typeof binaryPath !== 'string') {
    throw new AppError('Audio preview generation is unavailable on this server.', 503);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binaryPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      '-i', sourcePath,
      '-ss', String(startSeconds),
      '-t', String(durationSeconds),
      '-map', '0:a:0',
      '-vn',
      '-codec:a', 'libmp3lame',
      '-b:a', '128k',
      '-f', 'mp3',
      '-y', outputPath,
    ], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    } satisfies SpawnOptions);

    let stderr = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 60_000);
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < 4000) stderr += chunk.toString().slice(0, 4000 - stderr.length);
    });
    child.once('error', (error: Error) => {
      clearTimeout(timeout);
      reject(new AppError(`Audio preview generation failed: ${error.message}`, 500));
    });
    child.once('close', (code: number | null) => {
      clearTimeout(timeout);
      if (timedOut) reject(new AppError('Audio preview generation timed out. Please try again.', 504));
      else if (code === 0) resolve();
      else reject(new AppError(`Audio preview generation failed${stderr ? `: ${stderr.trim()}` : '.'}`, 500));
    });
  });
};

clientPortalRouter.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getSharedProject(req.params.token);
    const previewWindowSeconds = getPreviewWindowSeconds(project.tenant.maxPreviewSeconds);
    const tracks = await prisma.projectAudioTrack.findMany({
      where: { projectId: project.id, tenantId: project.tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        versions: {
          where: { isActiveVersion: true, status: 'READY' },
          take: 1,
          select: { id: true, fileName: true, durationSeconds: true },
        },
      },
    });
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      success: true,
      data: {
        project: { name: project.name },
        tracks: tracks.flatMap(({ versions, ...track }) => (
          versions[0] ? [{ ...track, version: versions[0] }] : []
        )),
        previewWindowSeconds,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError('This project link is invalid.', 404));
      return;
    }
    next(error);
  }
});

clientPortalRouter.get(
  '/:token/tracks/:trackId/preview',
  previewRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    let previewPath: string | undefined;
    try {
      const project = await getSharedProject(req.params.token);
      const previewWindowSeconds = getPreviewWindowSeconds(project.tenant.maxPreviewSeconds);
      const { version } = await getActiveVersion(project.id, project.tenantId, req.params.trackId);
      const startSeconds = z.coerce.number().int().min(0).parse(req.query.start ?? 0);
      const maxStart = Math.max(0, Math.floor(version.durationSeconds!) - previewWindowSeconds);
      if (startSeconds > maxStart) {
        throw new AppError('Choose a preview start within this audio track.', 400);
      }

      const sourcePath = resolveAudioStoragePath(version.originalStoragePath);
      const sourceStats = await fs.stat(sourcePath);
      if (!sourceStats.isFile()) throw new AppError('The requested audio file is unavailable.', 404);

      const previewDirectory = path.join(path.resolve(env.UPLOAD_DIR), '.preview-tmp');
      await fs.mkdir(previewDirectory, { recursive: true, mode: 0o700 });
      previewPath = path.join(previewDirectory, `${randomUUID()}.mp3`);
      await createPreviewClip(
        sourcePath,
        previewPath,
        startSeconds,
        Math.min(previewWindowSeconds, version.durationSeconds! - startSeconds)
      );
      await fs.chmod(previewPath, 0o600);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      await new Promise<void>((resolve, reject) => {
        res.sendFile(previewPath!, (error) => error ? reject(error) : resolve());
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('The preview request is invalid.', 400));
        return;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        next(new AppError('The requested audio file is unavailable.', 404));
        return;
      }
      if (res.headersSent) {
        res.destroy(error as Error);
        return;
      }
      next(error);
    } finally {
      if (previewPath) {
        try {
          await removeAudioFileIfPresent(previewPath);
        } catch (error) {
          console.error('[Client audio preview] Failed to remove temporary preview clip.', error);
        }
      }
    }
  }
);
