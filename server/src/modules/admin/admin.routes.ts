import { Router, Request, Response } from 'express';

export const adminRouter = Router();

adminRouter.get('/stats', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Platform Admin analytics module ready' });
});
