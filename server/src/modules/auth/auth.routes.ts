import { randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';
import { prisma } from '../../shared/prisma';

export const authRouter = Router();

const SESSION_COOKIE = 'cs_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'Password must be no more than 72 UTF-8 bytes.',
  });
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many attempts. Please wait a few minutes and try again.' },
  },
});
const fitsBcryptInput = (password: string): boolean => Buffer.byteLength(password, 'utf8') <= 72;

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email().max(254),
  password: passwordSchema.refine(fitsBcryptInput, {
    message: 'Password must be no more than 72 UTF-8 bytes.',
  }),
  studioName: z.string().trim().min(2).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(1)
    .max(128)
    .refine(fitsBcryptInput, { message: 'Password must be no more than 72 UTF-8 bytes.' }),
});

interface SessionClaims extends JwtPayload {
  sub: string;
}

const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_MS,
});

const setSessionCookie = (res: Response, userId: string): void => {
  const token = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: '1d',
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
};

const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

const requireTrustedOrigin = (req: Request): void => {
  const origin = req.get('origin');
  if (!origin) {
    throw new AppError('A valid browser origin is required.', 403);
  }

  const allowedOrigins = new Set([
    new URL(env.CLIENT_URL).origin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  if (!allowedOrigins.has(origin)) {
    throw new AppError('Request origin is not allowed.', 403);
  }
};

const getSessionUser = async (req: Request) => {
  const cookieHeader = req.headers.cookie;
  const sessionCookie = cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
  const token = sessionCookie?.slice(SESSION_COOKIE.length + 1);

  if (!token) {
    throw new AppError('You must be signed in to continue.', 401);
  }

  let claims: SessionClaims;
  try {
    const verified = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof verified === 'string' || typeof verified.sub !== 'string') {
      throw new AppError('Your session is invalid. Please sign in again.', 401);
    }
    claims = { sub: verified.sub };
  } catch {
    throw new AppError('Your session is invalid or expired. Please sign in again.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { tenant: true },
  });

  if (
    !user ||
    !user.isActive ||
    user.tenant.status === 'SUSPENDED' ||
    user.tenant.status === 'CANCELLED'
  ) {
    throw new AppError('This account is not available. Please contact support.', 403);
  }

  return user;
};

export const requireTenantSession: RequestHandler = async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    res.locals.authUser = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      clearSessionCookie(res);
    }
    sendAuthError(error, next);
  }
};

const sendAuthError = (error: unknown, next: NextFunction): void => {
  if (error instanceof z.ZodError) {
    next(new AppError(error.issues[0]?.message ?? 'Please check the submitted information.', 400));
    return;
  }

  next(error);
};

authRouter.post('/register', authAttemptLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireTrustedOrigin(req);
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('An account with this email already exists. Please sign in.', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const normalizedStudioName = input.studioName.trim();
    const slugBase =
      normalizedStudioName
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'studio';
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const user = await prisma.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.create({
        data: {
          name: normalizedStudioName,
          slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
          status: 'TRIAL',
          plan: 'FREE_TRIAL',
          trialEndsAt,
        },
      });

      return transaction.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName || null,
          role: 'TENANT_ADMIN',
        },
        include: { tenant: true },
      });
    });

    setSessionCookie(res, user.id);
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        workspace: {
          id: user.tenant.id,
          name: user.tenant.name,
          status: user.tenant.status,
          plan: user.tenant.plan,
          trialEndsAt: user.tenant.trialEndsAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const emailConflict = Array.isArray(target)
        ? target.includes('email')
        : typeof target === 'string' && target.includes('email');
      if (emailConflict) {
        sendAuthError(new AppError('An account with this email already exists. Please sign in.', 409), next);
        return;
      }
      next(error);
      return;
    }
    sendAuthError(error, next);
  }
});

authRouter.post('/login', authAttemptLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireTrustedOrigin(req);
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError('Email or password is incorrect.', 401);
    }
    if (!user.isActive || user.tenant.status === 'SUSPENDED' || user.tenant.status === 'CANCELLED') {
      throw new AppError('This account is not available. Please contact support.', 403);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    setSessionCookie(res, user.id);
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        workspace: {
          id: user.tenant.id,
          name: user.tenant.name,
          status: user.tenant.status,
          plan: user.tenant.plan,
          trialEndsAt: user.tenant.trialEndsAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      clearSessionCookie(res);
    }
    sendAuthError(error, next);
  }
});

authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getSessionUser(req);
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        workspace: {
          id: user.tenant.id,
          name: user.tenant.name,
          status: user.tenant.status,
          plan: user.tenant.plan,
          trialEndsAt: user.tenant.trialEndsAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      clearSessionCookie(res);
    }
    sendAuthError(error, next);
  }
});

authRouter.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  try {
    requireTrustedOrigin(req);
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (error) {
    sendAuthError(error, next);
  }
});
