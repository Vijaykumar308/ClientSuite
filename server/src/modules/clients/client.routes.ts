import { ClientStatus, Prisma } from '@prisma/client';
import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../middlewares/errorHandler';
import { prisma } from '../../shared/prisma';

export const clientRouter = Router();

const dateFilterSchema = z.string().datetime({ offset: true }).optional();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(''),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(200).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  createdAtFrom: dateFilterSchema,
  createdAtTo: dateFilterSchema,
  updatedAtFrom: dateFilterSchema,
  updatedAtTo: dateFilterSchema,
});

const createClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

const updateClientSchema = createClientSchema.partial()
  .extend({ status: z.nativeEnum(ClientStatus).optional() })
  .refine((input) => Object.keys(input).length > 0, 'At least one client field must be provided.');

const getTenantId = (res: Response): string => {
  const tenantId = res.locals.authUser?.tenantId;
  if (typeof tenantId !== 'string' || !tenantId) {
    throw new AppError('An authenticated studio workspace is required.', 401);
  }
  return tenantId;
};

const getDateRange = (from?: string, to?: string): Prisma.DateTimeFilter | undefined => {
  if (!from && !to) return undefined;

  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return range;
};

clientRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const filters = listQuerySchema.parse(req.query);
    const {
      page,
      pageSize,
      search,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      ...fieldFilters
    } = filters;

    const where: Prisma.ClientWhereInput = {
      tenantId,
      ...(fieldFilters.status && { status: fieldFilters.status }),
      ...(['name', 'email', 'phone', 'company', 'notes'] as const).reduce<Prisma.ClientWhereInput>(
        (fieldWhere, field) => {
          const value = fieldFilters[field];
          if (value) fieldWhere[field] = { contains: value, mode: 'insensitive' };
          return fieldWhere;
        },
        {}
      ),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(getDateRange(createdAtFrom, createdAtTo) && {
        createdAt: getDateRange(createdAtFrom, createdAtTo),
      }),
      ...(getDateRange(updatedAtFrom, updatedAtTo) && {
        updatedAt: getDateRange(updatedAtFrom, updatedAtTo),
      }),
    };

    const [clients, total] = await prisma.$transaction([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      success: true,
      data: clients,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid client filters.', 400));
      return;
    }
    next(error);
  }
});

clientRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const input = createClientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        notes: input.notes || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Please check the client details.', 400));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      next(new AppError('A client with this email already exists in this workspace.', 409));
      return;
    }
    next(error);
  }
});

clientRouter.get('/:clientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const clientId = z.string().uuid().parse(req.params.clientId);
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!client) throw new AppError('Client not found in this workspace.', 404);
    res.json({ success: true, data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Invalid client identifier.', 400));
      return;
    }
    next(error);
  }
});

clientRouter.patch('/:clientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(res);
    const clientId = z.string().uuid().parse(req.params.clientId);
    const input = updateClientSchema.parse(req.body);
    const existing = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
    if (!existing) throw new AppError('Client not found in this workspace.', 404);

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...input,
        ...(input.email && { email: input.email.toLowerCase() }),
        ...(input.phone !== undefined && { phone: input.phone || null }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ success: true, data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.issues[0]?.message ?? 'Please check the client details.', 400));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      next(new AppError('A client with this email already exists in this workspace.', 409));
      return;
    }
    next(error);
  }
});
