import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jatayu-super-secure-hackathon-jwt-secret-2026';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Fetch fresh user from DB
  const user = db.prepare('SELECT id, email, name, phone, role, account_status, blood_group, google_id, google_sub, profile_picture, auth_provider, email_verified FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  if (user.account_status === 'suspended') {
    return res.status(403).json({ error: 'Account has been suspended by administration.' });
  }

  // If user is responder, attach responder details
  if (user.role === 'responder') {
    const responder = db.prepare('SELECT responder_type, is_verified, is_available, latitude, longitude, badge_number FROM responders WHERE id = ?').get(user.id);
    req.responder = responder;
  }

  req.user = user;
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Role '${req.user.role}' lacks permission.` });
    }
    next();
  };
}
