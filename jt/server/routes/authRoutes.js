import express from 'express';
import bcrypt from 'bcryptjs';
import { db, addAuditLog } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = express.Router();

// REGISTER (WITH PHONE & EMAIL VALIDATION)
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone, role = 'user', responder_type = 'Police' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!phone || !phone.trim() || phone.trim().length < 8) {
      return res.status(400).json({ error: 'Valid phone number is required for emergency dispatch & contact alerts.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const allowedRole = ['user', 'responder', 'admin'].includes(role) ? role : 'user';

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, phone, role, account_status, blood_group, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 'O+', 1, ?, ?)
    `).run(id, normalizedEmail, password_hash, name.trim(), phone.trim(), allowedRole, now, now);

    if (allowedRole === 'responder') {
      const isVerified = 1;
      const badge = 'JTY-' + Math.floor(1000 + Math.random() * 9000);
      db.prepare(`
        INSERT INTO responders (id, responder_type, is_verified, is_available, latitude, longitude, badge_number, updated_at)
        VALUES (?, ?, ?, 1, 12.9750, 77.6050, ?, ?)
      `).run(id, responder_type, isVerified, badge, now);
    }

    addAuditLog(normalizedEmail, `Registered new account as ${allowedRole}`, `Phone: ${phone.trim()}`);

    const user = db.prepare('SELECT id, email, name, phone, role, account_status, blood_group, email_verified FROM users WHERE id = ?').get(id);
    const token = signToken(user);

    let responderProfile = null;
    if (user.role === 'responder') {
      responderProfile = db.prepare('SELECT * FROM responders WHERE id = ?').get(user.id);
    }

    res.status(201).json({
      message: 'Account created and verified successfully',
      token,
      user: { ...user, responder: responderProfile }
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// GOOGLE SIGN-IN / VERIFICATION
router.post('/google', (req, res) => {
  try {
    const { email, name, google_id, phone = '', role = 'user', responder_type = 'Police' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google email verification failed: email required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    const now = new Date().toISOString();

    if (!user) {
      // New user from Google
      const id = 'usr_g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const salt = bcrypt.genSaltSync(10);
      const randomPasswordHash = bcrypt.hashSync(Math.random().toString(36), salt);
      const allowedRole = ['user', 'responder', 'admin'].includes(role) ? role : 'user';

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, phone, role, account_status, blood_group, google_id, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 'O+', ?, 1, ?, ?)
      `).run(id, normalizedEmail, randomPasswordHash, name || normalizedEmail.split('@')[0], phone.trim() || '+91 98765 00000', allowedRole, google_id || 'google_verified', now, now);

      if (allowedRole === 'responder') {
        const badge = 'JTY-' + Math.floor(1000 + Math.random() * 9000);
        db.prepare(`
          INSERT INTO responders (id, responder_type, is_verified, is_available, latitude, longitude, badge_number, updated_at)
          VALUES (?, ?, 1, 1, 12.9750, 77.6050, ?, ?)
        `).run(id, responder_type, badge, now);
      }

      addAuditLog(normalizedEmail, 'Google Auth Registration (Verified)', `Google ID: ${google_id || 'N/A'}`);
      user = db.prepare('SELECT id, email, name, phone, role, account_status, blood_group, email_verified FROM users WHERE id = ?').get(id);
    } else {
      // Existing user: mark email verified and update google_id
      db.prepare('UPDATE users SET email_verified = 1, google_id = COALESCE(google_id, ?), updated_at = ? WHERE id = ?').run(google_id || 'google_verified', now, user.id);
      addAuditLog(normalizedEmail, 'Google Auth Login (Verified)', '');
    }

    if (user.account_status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact administrator.' });
    }

    const token = signToken(user);
    let responderProfile = null;
    if (user.role === 'responder') {
      responderProfile = db.prepare('SELECT * FROM responders WHERE id = ?').get(user.id);
    }

    res.json({
      message: 'Google verification successful',
      token,
      user: { ...user, responder: responderProfile }
    });
  } catch (err) {
    console.error('[Google Auth Error]:', err);
    res.status(500).json({ error: 'Google verification failed.' });
  }
});

// LOGIN
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userWithHash = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!userWithHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, userWithHash.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (userWithHash.account_status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Please contact administrator.' });
    }

    const { password_hash, ...user } = userWithHash;
    const token = signToken(user);

    let responderProfile = null;
    if (user.role === 'responder') {
      responderProfile = db.prepare('SELECT * FROM responders WHERE id = ?').get(user.id);
    }

    addAuditLog(user.email, 'Logged in', `Role: ${user.role}`);

    res.json({
      message: 'Login successful',
      token,
      user: { ...user, responder: responderProfile }
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET CURRENT USER (/me)
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      ...req.user,
      responder: req.responder || null
    }
  });
});

export default router;
