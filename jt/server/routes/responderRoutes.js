import express from 'express';
import { db, addAuditLog } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { notifyResponderUpdate } from '../websocket.js';

const router = express.Router();

// 1. GET ALL RESPONDERS (For live maps & admin directory)
router.get('/', requireAuth, (req, res) => {
  try {
    const responders = db.prepare(`
      SELECT
        u.id, u.name, u.email, u.phone, u.account_status,
        r.responder_type, r.is_verified, r.is_available,
        r.latitude, r.longitude, r.badge_number, r.updated_at
      FROM responders r
      JOIN users u ON r.id = u.id
      ORDER BY r.is_available DESC, r.is_verified DESC
    `).all();

    res.json({ responders });
  } catch (err) {
    console.error('[Get Responders Error]:', err);
    res.status(500).json({ error: 'Failed to fetch responders.' });
  }
});

// 2. TOGGLE AVAILABILITY / UPDATE GPS (FOR RESPONDERS)
router.patch('/availability', requireAuth, requireRole('responder'), (req, res) => {
  try {
    const { is_available, latitude, longitude } = req.body;
    const now = new Date().toISOString();

    const current = db.prepare('SELECT * FROM responders WHERE id = ?').get(req.user.id);
    if (!current) {
      return res.status(404).json({ error: 'Responder record not found.' });
    }

    const newAvailable = is_available !== undefined ? (is_available ? 1 : 0) : current.is_available;
    const newLat = Number.isFinite(latitude) ? latitude : current.latitude;
    const newLon = Number.isFinite(longitude) ? longitude : current.longitude;

    db.prepare(`
      UPDATE responders
      SET is_available = ?,
          latitude = ?,
          longitude = ?,
          updated_at = ?
      WHERE id = ?
    `).run(newAvailable, newLat, newLon, now, req.user.id);

    const updated = db.prepare(`
      SELECT
        u.id, u.name, u.email, u.phone,
        r.responder_type, r.is_verified, r.is_available,
        r.latitude, r.longitude, r.badge_number, r.updated_at
      FROM responders r
      JOIN users u ON r.id = u.id
      WHERE r.id = ?
    `).get(req.user.id);

    notifyResponderUpdate(updated);

    res.json({
      message: 'Responder status updated successfully',
      responder: updated
    });
  } catch (err) {
    console.error('[Update Responder Availability Error]:', err);
    res.status(500).json({ error: 'Failed to update availability.' });
  }
});

// 3. ADMIN VERIFY / REJECT RESPONDER
router.patch('/:id/verify', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { is_verified } = req.body;
    const now = new Date().toISOString();

    const responder = db.prepare('SELECT * FROM responders WHERE id = ?').get(req.params.id);
    if (!responder) {
      return res.status(404).json({ error: 'Responder not found.' });
    }

    const verifiedVal = is_verified ? 1 : 0;
    db.prepare(`
      UPDATE responders
      SET is_verified = ?,
          updated_at = ?
      WHERE id = ?
    `).run(verifiedVal, now, req.params.id);

    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.params.id);
    const actionLabel = verifiedVal ? 'Verified' : 'Unverified/Revoked';
    addAuditLog(req.user.email, `${actionLabel} responder ${user?.name || req.params.id}`, `Badge: ${responder.badge_number}`);

    const updated = db.prepare(`
      SELECT
        u.id, u.name, u.email, u.phone,
        r.responder_type, r.is_verified, r.is_available,
        r.latitude, r.longitude, r.badge_number, r.updated_at
      FROM responders r
      JOIN users u ON r.id = u.id
      WHERE r.id = ?
    `).get(req.params.id);

    notifyResponderUpdate(updated);

    res.json({
      message: `Responder ${actionLabel.toLowerCase()} successfully`,
      responder: updated
    });
  } catch (err) {
    console.error('[Verify Responder Error]:', err);
    res.status(500).json({ error: 'Failed to update verification status.' });
  }
});

// 4. GET RESPONDER STATS
router.get('/stats', requireAuth, requireRole('responder'), (req, res) => {
  try {
    const resolved = db.prepare(`
      SELECT COUNT(*) as count FROM incidents
      WHERE responder_id = ? AND status = 'Resolved'
    `).get(req.user.id).count;

    const active = db.prepare(`
      SELECT COUNT(*) as count FROM incidents
      WHERE responder_id = ? AND status IN ('Accepted', 'En route', 'On scene')
    `).get(req.user.id).count;

    res.json({
      resolvedCount: resolved,
      activeCount: active,
      avgEtaMinutes: 5.2
    });
  } catch (err) {
    console.error('[Responder Stats Error]:', err);
    res.status(500).json({ error: 'Failed to fetch responder stats.' });
  }
});

export default router;
