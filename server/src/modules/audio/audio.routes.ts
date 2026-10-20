import { Router, Request, Response } from 'express';

export const audioRouter = Router();

audioRouter.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Audio processing and streaming module ready' });
});
