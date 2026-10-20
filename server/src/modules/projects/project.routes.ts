import { Prisma, ProjectStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../middlewares/errorHandler';
import { prisma } from '../../shared/prisma';

export const projectRouter = Router();

const dateTimeFilterSchema = z.string().datetime({ offset: true }).optional();
const dateOnlyFilterSchema = z.string().date().optional();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(''),
  name: z.string().trim().max(120).optional(),
  clientId: z.string().uuid().optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  price: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/).optional(),
  dueDate: dateOnlyFilterSchema,
  createdAtFrom: dateTimeFilterSchema,
  createdAtTo: dateTimeFilterSchema,
  updatedAtFrom: dateTimeFilterSchema,
  updatedAtTo: dateTimeFilterSchema,
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  clientId: z.string().uuid(),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: dateOnlyFilterSchema.nullable(),
  price: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/).optional().nullable(),
});

const getTenantId = (res: Response): string => {
  const tenantId = res.locals.authUser?.tenantId;
  if (typeof tenantId !== 'string' || !tenantId) {
    throw new AppError('An authenticated studio workspace is required.', 401);
  }
  return tenantId;
};

const getDateRange = (from?: string, to?: string): Prisma.DateTimeFilter | undefined => {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to) }),
  };
};

const projectSelection = {
  id: true,
  clientId: true,
  name: true,
  description: true,
  status: true,
  price: true,
  currency: true,
  dueDate: true,
  portalEnabled: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ProjectSelect;

projectRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const filters = listQuerySchema.parse(req.query);
    const {
      page,
      pageSize,
      search,
      name,
      clientId,
      description,
      status,
      price,
      dueDate,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
    } = filters;

    const dueDateValue = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : undefined;
    const where: Prisma.ProjectWhereInput = {
      tenantId,
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(clientId && { clientId }),
      ...(description && { description: { contains: description, mode: 'insensitive' } }),
      ...(status && { status }),
      ...(price && { price: new Prisma.Decimal(price) }),
      ...(dueDateValue && {
        dueDate: {
          gte: dueDateValue,
          lt: new Date(dueDateValue.getTime() + 24 * 60 * 60 * 1000),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
          { client: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(getDateRange(createdAtFrom, createdAtTo) && {
        createdAt: getDateRange(createdAtFrom, createdAtTo),
      }),
      ...(getDateRange(updatedAtFrom, updatedAtTo) && {
        updatedAt: getDateRange(updatedAtFrom, updatedAtTo),
      }),
    };

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: projectSelection,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid project filters.', 400));
      return;
    }
    next(error);
  }
});

projectRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const input = createProjectSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, tenantId, status: { not: 'ARCHIVED' } },
      select: { id: true },
    });
    if (!client) throw new AppError('Select an active client from this workspace.', 400);

    const project = await prisma.project.create({
      data: {
        tenantId,
        clientId: client.id,
        name: input.name,
        description: input.description || null,
        ...(input.dueDate && { dueDate: new Date(`${input.dueDate}T00:00:00.000Z`) }),
        ...(input.price && { price: new Prisma.Decimal(input.price) }),
      },
      select: projectSelection,
    });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Please check the project details.', 400));
      return;
    }
    next(error);
  }
});

projectRouter.get('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const projectId = z.string().uuid().parse(req.params.projectId);
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { ...projectSelection, portalToken: true },
    });
    if (!project) throw new AppError('Project not found in this workspace.', 404);
    res.json({ success: true, data: project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid project identifier.', 400));
      return;
    }
    next(error);
  }
});

projectRouter.post('/:projectId/share-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const projectId = z.string().uuid().parse(req.params.projectId);
    const token = randomUUID();
    const project = await prisma.project.updateMany({
      where: { id: projectId, tenantId },
      data: {
        portalToken: token,
        portalTokenExpiresAt: null,
        portalEnabled: true,
      },
    });
    if (project.count === 0) throw new AppError('Project not found in this workspace.', 404);
    res.json({ success: true, data: { token } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid project identifier.', 400));
      return;
    }
    next(error);
  }
});

projectRouter.delete('/:projectId/share-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const projectId = z.string().uuid().parse(req.params.projectId);
    const project = await prisma.project.updateMany({
      where: { id: projectId, tenantId },
      data: {
        portalToken: randomUUID(),
        portalTokenExpiresAt: null,
        portalEnabled: false,
      },
    });
    if (project.count === 0) throw new AppError('Project not found in this workspace.', 404);
    res.json({ success: true, data: { revoked: true } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid project identifier.', 400));
      return;
    }
    next(error);
  }
});
