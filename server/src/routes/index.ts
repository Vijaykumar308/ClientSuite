import { Router } from 'express';
import healthRoutes from './health.routes';
import { authRouter, requireTenantSession } from '../modules/auth/auth.routes';
import { clientRouter } from '../modules/clients/client.routes';
import { projectRouter } from '../modules/projects/project.routes';
import { audioRouter } from '../modules/audio/audio.routes';
import { paymentRouter } from '../modules/payments/payment.routes';
import { adminRouter } from '../modules/admin/admin.routes';

export const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use('/auth', authRouter);
apiRouter.use('/tenant', requireTenantSession);
apiRouter.use('/tenant/clients', clientRouter);
apiRouter.use('/tenant/projects', projectRouter);
apiRouter.use('/audio', audioRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin', adminRouter);

export default apiRouter;
