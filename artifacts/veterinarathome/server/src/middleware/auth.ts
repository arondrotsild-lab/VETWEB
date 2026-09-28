import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or SESSION_SECRET must be configured');
  }
  return secret;
})();

export interface AuthRequest extends Request {
  user?: { id: number; role: string; name: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Токен не предоставлен' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string; name: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Нет доступа' });
      return;
    }
    next();
  };
}

export function generateToken(user: { id: number; role: string; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
}
