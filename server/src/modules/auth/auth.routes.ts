import { Router, Request, Response } from 'express';

export const authRouter = Router();

authRouter.post('/login', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Auth module ready' });
});

authRouter.post('/register', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Register endpoint ready' });
});
