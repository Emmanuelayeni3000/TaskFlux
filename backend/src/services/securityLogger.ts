import type { Request } from 'express';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BLOCKED = 'LOGIN_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

interface SecurityLogEntry {
  timestamp: string;
  event: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class SecurityLogger {
  private getClientInfo(req: Request) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
    };
  }

  private formatLogEntry(entry: SecurityLogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: entry.timestamp,
      service: 'taskflux-auth',
      version: '1.0.0',
    });
  }

  private logToConsole(entry: SecurityLogEntry) {
    const logEntry = this.formatLogEntry(entry);
    
    switch (entry.severity) {
      case 'CRITICAL':
        console.error(`[SECURITY CRITICAL] ${logEntry}`);
        break;
      case 'HIGH':
        console.error(`[SECURITY HIGH] ${logEntry}`);
        break;
      case 'MEDIUM':
        console.warn(`[SECURITY MEDIUM] ${logEntry}`);
        break;
      case 'LOW':
      default:
        console.info(`[SECURITY INFO] ${logEntry}`);
        break;
    }
  }

  // In production, you might want to send these to a security monitoring service
  // like Splunk, ELK Stack, or cloud logging services
  private async logToExternalService(entry: SecurityLogEntry) {
    // TODO: Implement external logging service integration
    // Example: await sendToSplunk(entry);
    // Example: await sendToElastic(entry);
    // For now, we'll just log to console
  }

  private async log(entry: SecurityLogEntry) {
    this.logToConsole(entry);
    
    // In production, you might want to log to external services for critical events
    if (entry.severity === 'CRITICAL' || entry.severity === 'HIGH') {
      await this.logToExternalService(entry);
    }
  }

  async logLoginSuccess(req: Request, userId: string, email: string) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    
    await this.log({
      timestamp: new Date().toISOString(),
      event: SecurityEventType.LOGIN_SUCCESS,
      userId,
      email,
      ipAddress,
      userAgent,
      severity: 'LOW',
    });
  }

  async logLoginFailed(req: Request, email?: string, reason?: string) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    
    await this.log({
      timestamp: new Date().toISOString(),
      event: SecurityEventType.LOGIN_FAILED,
      email,
      ipAddress,
      userAgent,
      details: { reason },
      severity: 'MEDIUM',
    });
  }

  async logAccountLocked(req: Request, email: string, lockDuration: number) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    
    await this.log({
      timestamp: new Date().toISOString(),
      event: SecurityEventType.ACCOUNT_LOCKED,
      email,
      ipAddress,
      userAgent,
      details: { 
        lockDurationMinutes: lockDuration,
        reason: 'Too many failed login attempts'
      },
      severity: 'HIGH',
    });
  }

  async logRateLimitExceeded(req: Request, email?: string, limitType: 'IP' | 'EMAIL' = 'IP') {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    
    await this.log({
      timestamp: new Date().toISOString(),
      event: SecurityEventType.RATE_LIMIT_EXCEEDED,
      email,
      ipAddress,
      userAgent,
      details: { limitType },
      severity: 'HIGH',
    });
  }

  async logSuspiciousActivity(req: Request, activity: string, details?: Record<string, any>) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    
    await this.log({
      timestamp: new Date().toISOString(),
      event: SecurityEventType.SUSPICIOUS_ACTIVITY,
      ipAddress,
      userAgent,
      details: { activity, ...details },
      severity: 'CRITICAL',
    });
  }

  // Helper method to log multiple failed attempts from same IP
  async logRepeatedFailures(req: Request, attemptCount: number, timeWindow: number) {
    if (attemptCount >= 3) {
      await this.logSuspiciousActivity(req, 'Multiple login failures from same IP', {
        attemptCount,
        timeWindowMinutes: timeWindow / (1000 * 60),
      });
    }
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

// Export types for use in other modules
export type { SecurityLogEntry };