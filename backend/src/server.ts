import cors from 'cors';
import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';

import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import projectRoutes from './routes/projectRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import chatRoutes from './routes/chatRoutes';
import notificationRoutes from './routes/notifications';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';
import { prisma } from './prisma/client';
import { swaggerSpec } from './utils/swagger';
import { initSocketServer } from './realtime/socket';

dotenv.config();

const app = express();

app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
  .map((origin: string) => origin.trim())
  .filter((origin: string) => origin.length > 0);

app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : '*' ,
    credentials: true,
  }),
);

app.use('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workspaces', chatRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = createServer(app);
const io = initSocketServer(httpServer, { allowedOrigins });

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

httpServer.listen(port, () => {
  console.log(`TaskFlux backend listening on port ${port}`);
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  io.close();
  httpServer.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
