import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './errorMiddleware';
import { securityLogger } from '../services/securityLogger';

// Simple in-memory store for rate limiting
// In production, you should use Redis or a proper database
interface RateLimitStore {
  [key: string]: {
    attempts: number;
    lastAttempt: number;
    blockedUntil?: number;
  };
}

const loginAttempts: RateLimitStore = {};
const ipAttempts: RateLimitStore = {};

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const IP_MAX_ATTEMPTS = 10; // More lenient for IP-based limiting
const IP_LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes

const cleanupOldAttempts = (store: RateLimitStore, window: number) => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    const record = store[key];
    if (now - record.lastAttempt > window && (!record.blockedUntil || now > record.blockedUntil)) {
      delete store[key];
    }
  });
};

const isBlocked = (key: string, store: RateLimitStore): boolean => {
  const record = store[key];
  if (!record) return false;
  
  return record.blockedUntil ? Date.now() < record.blockedUntil : false;
};

const addAttempt = (key: string, store: RateLimitStore, maxAttempts: number, lockoutTime: number, window: number) => {
  const now = Date.now();
  const record = store[key];
  
  if (!record) {
    store[key] = {
      attempts: 1,
      lastAttempt: now,
    };
    return;
  }
  
  // Reset if outside the window
  if (now - record.lastAttempt > window) {
    store[key] = {
      attempts: 1,
      lastAttempt: now,
    };
    return;
  }
  
  record.attempts += 1;
  record.lastAttempt = now;
  
  // Block if max attempts reached
  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + lockoutTime;
  }
};

const getRemainingTime = (key: string, store: RateLimitStore): number => {
  const record = store[key];
  if (!record || !record.blockedUntil) return 0;
  
  const remaining = record.blockedUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000 / 60)); // Return minutes
};

export const loginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  // Clean up old attempts periodically
  if (Math.random() < 0.1) { // 10% chance to cleanup on each request
    cleanupOldAttempts(loginAttempts, ATTEMPT_WINDOW);
    cleanupOldAttempts(ipAttempts, ATTEMPT_WINDOW);
  }

  const email = req.body?.email?.toLowerCase()?.trim();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Check IP-based rate limiting
  if (isBlocked(ip, ipAttempts)) {
    const remainingTime = getRemainingTime(ip, ipAttempts);
    await securityLogger.logRateLimitExceeded(req, email, 'IP');
    throw new HttpError(
      429, 
      `Too many login attempts from this IP address. Please try again in ${remainingTime} minutes.`
    );
  }

  // Check email-based rate limiting (only if email is provided)
  if (email && isBlocked(email, loginAttempts)) {
    const remainingTime = getRemainingTime(email, loginAttempts);
    await securityLogger.logAccountLocked(req, email, remainingTime);
    throw new HttpError(
      429, 
      `Too many failed login attempts for this account. Please try again in ${remainingTime} minutes or reset your password.`
    );
  }

  // Add tracking function to request for failed login attempts
  req.rateLimitNext = async (error?: any) => {
    if (error && error instanceof HttpError && error.statusCode === 401) {
      // This is a failed login attempt
      addAttempt(ip, ipAttempts, IP_MAX_ATTEMPTS, IP_LOCKOUT_TIME, ATTEMPT_WINDOW);
      
      if (email) {
        addAttempt(email, loginAttempts, MAX_LOGIN_ATTEMPTS, LOCKOUT_TIME, ATTEMPT_WINDOW);
      }

      // Check if we should now block
      if (isBlocked(ip, ipAttempts)) {
        const remainingTime = getRemainingTime(ip, ipAttempts);
        await securityLogger.logRateLimitExceeded(req, email, 'IP');
        return next(new HttpError(
          429, 
          `Too many failed login attempts. Your IP address has been temporarily blocked. Please try again in ${remainingTime} minutes.`
        ));
      }

      if (email && isBlocked(email, loginAttempts)) {
        const remainingTime = getRemainingTime(email, loginAttempts);
        await securityLogger.logAccountLocked(req, email, remainingTime);
        return next(new HttpError(
          429, 
          `Account temporarily locked due to too many failed login attempts. Please try again in ${remainingTime} minutes or reset your password.`
        ));
      }
    }

    next(error);
  };

  next();
};

// Export cleanup function for testing or manual cleanup
export const cleanupRateLimitStore = () => {
  cleanupOldAttempts(loginAttempts, ATTEMPT_WINDOW);
  cleanupOldAttempts(ipAttempts, ATTEMPT_WINDOW);
};

// Export store getters for monitoring (optional)
export const getRateLimitStats = () => ({
  loginAttempts: Object.keys(loginAttempts).length,
  ipAttempts: Object.keys(ipAttempts).length,
});