import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables before creating Prisma client
dotenv.config();

export const prisma = new PrismaClient();
