import jwt from 'jsonwebtoken';

import { HttpError } from '../middlewares/errorMiddleware';

interface AccessTokenPayload {
  userId: string;
  email: string;
}

export const createAccessToken = (payload: AccessTokenPayload) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError(500, 'JWT secret not configured');
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError(500, 'JWT secret not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;
    return decoded;
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token');
  }
};
