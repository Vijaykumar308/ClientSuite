import { Router, Request, Response } from 'express';

export const projectRouter = Router();

projectRouter.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'Project management module ready' });
});
