import { Request, Response, NextFunction } from 'express';

/**
 * Simple auth middleware for demo
 * In production, this would verify JWT tokens or OAuth sessions
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // For demo, we extract user ID from header
  // In production, this would validate JWT/OAuth tokens
  const userId = req.headers['x-user-id'];

  if (!userId) {
    // Allow unauth requests but endpoints will check for user-id header
    next();
    return;
  }

  next();
}

/**
 * CORS and security headers middleware
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
