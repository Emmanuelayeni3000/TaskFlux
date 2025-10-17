import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { HttpError } from './errorMiddleware';

interface TokenPayload {
  userId: string;
  email: string;
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'Authorization header missing or malformed'));
    return;
  }

  const token = header.substring('Bearer '.length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    next(new HttpError(500, 'JWT secret not configured'));
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};
