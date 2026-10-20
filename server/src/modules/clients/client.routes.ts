import { Router, Request, Response } from 'express';

export const clientRouter = Router();

clientRouter.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'Client CRM module ready' });
});
