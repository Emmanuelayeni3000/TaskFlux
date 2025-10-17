import cors from 'cors';
import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';
import { prisma } from './prisma/client';
import { swaggerSpec } from './utils/swagger';

dotenv.config();

const app = express();

app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
  .map((origin: string) => origin.trim())
  .filter((origin: string) => origin.length > 0);
app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : '*',
    credentials: true,
  }),
);

app.use('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(port, () => {
  console.log(`TaskFlux backend listening on port ${port}`);
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
