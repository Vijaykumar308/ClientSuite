import { Router, Request, Response } from 'express';

export const paymentRouter = Router();

paymentRouter.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Payment engine and webhook module ready' });
});
