import express from 'express';
import { db, addAuditLog } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import {
  notifyNewEmergency,
  notifyIncidentUpdate,
  notifyChatMessage
} from '../websocket.js';
import { dispatchRealEmergencyAlert } from '../services/notificationService.js';

const router = express.Router();

// Helper to compute approximate distance in km (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

// 1. TRIGGER SOS (CREATE INCIDENT)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      latitude = 12.9784,
      longitude = 77.6408,
      emergency_type = 'Personal Safety',
      address = 'Indiranagar, Bengaluru',
      accuracy = 10
    } = req.body;

    const id = 'JTY-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO incidents (
        id, user_id, user_name, user_phone, emergency_type, status,
        latitude, longitude, address, accuracy, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      req.user.name,
      req.user.phone || '',
      emergency_type,
      latitude,
      longitude,
      address,
      accuracy,
      now,
      now
    );

    // Initial timeline events
    const insertTimeline = db.prepare(`
      INSERT INTO incident_timeline (incident_id, label, details, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertTimeline.run(id, `SOS triggered by ${req.user.name}`, `Emergency alert: ${emergency_type} with GPS beacon`, req.user.name, now);

    // Notify contacts via Real Carrier / Gateway Dispatch
    const contacts = db.prepare('SELECT id, name, phone, relationship FROM contacts WHERE user_id = ?').all(req.user.id);
    let dispatchReport = null;
    if (contacts.length > 0) {
      dispatchReport = await dispatchRealEmergencyAlert({
        user: req.user,
        incident: { id, emergency_type, address, latitude, longitude },
        contacts
      });
      insertTimeline.run(
        id,
        `Trusted contacts alerted (${contacts.length})`,
        `Real notification dispatched to: ${contacts.map(c => `${c.name} (${c.phone})`).join(', ')}`,
        'Carrier Gateway',
        new Date(Date.now() + 500).toISOString()
      );
    }

    insertTimeline.run(id, 'Broadcasted to nearby responders', 'Emergency telemetry beamed to available response units', 'Dispatch Engine', new Date(Date.now() + 1000).toISOString());

    addAuditLog(req.user.email, `SOS beacon triggered: ${id}`, `Type: ${emergency_type}, Lat: ${latitude}, Lon: ${longitude}`);

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);

    // Broadcast in real-time
    notifyNewEmergency(incident);

    res.status(201).json({
      message: 'SOS incident created successfully',
      incident,
      dispatchReport
    });
  } catch (err) {
    console.error('[Create Incident Error]:', err);
    res.status(500).json({ error: 'Failed to create emergency incident.' });
  }
});

// 2. GET USER'S INCIDENTS
router.get('/my', requireAuth, (req, res) => {
  try {
    const incidents = db.prepare(`
      SELECT * FROM incidents
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ incidents });
  } catch (err) {
    console.error('[Get My Incidents Error]:', err);
    res.status(500).json({ error: 'Failed to fetch incident history.' });
  }
});

// 3. GET PENDING INCIDENTS (FOR RESPONDERS)
router.get('/pending', requireAuth, (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT * FROM incidents
      WHERE status = 'Pending'
      ORDER BY created_at DESC
    `).all();

    // If responder has location, calculate distance for each
    const responderLat = req.responder?.latitude || 12.9750;
    const responderLon = req.responder?.longitude || 77.6050;

    const enriched = pending.map(item => {
      const distanceKm = calculateDistance(responderLat, responderLon, item.latitude, item.longitude);
      return {
        ...item,
        distance_km: distanceKm,
        eta_minutes: distanceKm ? Math.max(3, Math.round(distanceKm * 2.5)) : 5
      };
    });

    res.json({ incidents: enriched });
  } catch (err) {
    console.error('[Get Pending Incidents Error]:', err);
    res.status(500).json({ error: 'Failed to fetch pending emergencies.' });
  }
});

// 4. GET ASSIGNED INCIDENTS (FOR RESPONDERS)
router.get('/assigned', requireAuth, (req, res) => {
  try {
    const assigned = db.prepare(`
      SELECT * FROM incidents
      WHERE responder_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ incidents: assigned });
  } catch (err) {
    console.error('[Get Assigned Incidents Error]:', err);
    res.status(500).json({ error: 'Failed to fetch assigned incidents.' });
  }
});

// 5. GET ALL INCIDENTS (ADMIN)
router.get('/all', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM incidents ORDER BY created_at DESC';
    let params = [];

    if (status && status !== 'all') {
      query = 'SELECT * FROM incidents WHERE status = ? ORDER BY created_at DESC';
      params = [status];
    }

    const incidents = db.prepare(query).all(...params);
    res.json({ incidents });
  } catch (err) {
    console.error('[Get All Incidents Error]:', err);
    res.status(500).json({ error: 'Failed to fetch incidents.' });
  }
});

// 6. GET SINGLE INCIDENT DETAILS (WITH TIMELINE & MESSAGES)
router.get('/:id', requireAuth, (req, res) => {
  try {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    const timeline = db.prepare(`
      SELECT id, label, details, actor_name, created_at
      FROM incident_timeline
      WHERE incident_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    const messages = db.prepare(`
      SELECT id, sender_id, sender_name, sender_role, message, created_at
      FROM incident_messages
      WHERE incident_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    let responderDetails = null;
    if (incident.responder_id) {
      responderDetails = db.prepare(`
        SELECT u.id, u.name, u.phone, r.responder_type, r.latitude, r.longitude, r.badge_number
        FROM users u
        JOIN responders r ON u.id = r.id
        WHERE u.id = ?
      `).get(incident.responder_id);
    }

    res.json({
      incident,
      timeline,
      messages,
      responder: responderDetails
    });
  } catch (err) {
    console.error('[Get Incident Detail Error]:', err);
    res.status(500).json({ error: 'Failed to fetch incident details.' });
  }
});

// 7. RESPONDER ACCEPTS INCIDENT
router.post('/:id/accept', requireAuth, requireRole('responder'), (req, res) => {
  try {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }
    if (incident.status !== 'Pending') {
      return res.status(400).json({ error: `Cannot accept incident with status '${incident.status}'` });
    }

    const responder = db.prepare('SELECT * FROM responders WHERE id = ?').get(req.user.id);
    const distanceKm = calculateDistance(responder?.latitude, responder?.longitude, incident.latitude, incident.longitude);
    const etaMinutes = distanceKm ? Math.max(3, Math.round(distanceKm * 2.5)) : 6;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE incidents
      SET status = 'Accepted',
          responder_id = ?,
          responder_name = ?,
          responder_type = ?,
          eta_minutes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      req.user.id,
      req.user.name,
      responder?.responder_type || 'Responder',
      etaMinutes,
      now,
      incident.id
    );

    // Record timeline
    db.prepare(`
      INSERT INTO incident_timeline (incident_id, label, details, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      incident.id,
      `Accepted by ${req.user.name} (${responder?.responder_type || 'Responder'})`,
      `ETA: ~${etaMinutes} mins (${distanceKm || '1.2'} km away)`,
      req.user.name,
      now
    );

    addAuditLog(req.user.email, `Accepted emergency ${incident.id}`, `Responder: ${req.user.name}, ETA: ${etaMinutes}m`);

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incident.id);
    notifyIncidentUpdate(updated);

    res.json({
      message: 'Incident accepted successfully',
      incident: updated
    });
  } catch (err) {
    console.error('[Accept Incident Error]:', err);
    res.status(500).json({ error: 'Failed to accept incident.' });
  }
});

// 8. UPDATE INCIDENT STATUS (En route -> On scene -> Resolved)
router.patch('/:id/status', requireAuth, (req, res) => {
  try {
    const { status, notes = '' } = req.body;
    const validStatuses = ['Accepted', 'En route', 'On scene', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
    }

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    // Permission check: only assigned responder or admin can update
    if (req.user.role !== 'admin' && incident.responder_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this incident.' });
    }

    const now = new Date().toISOString();
    let eta = incident.eta_minutes;
    if (status === 'En route') eta = Math.max(2, (eta || 6) - 2);
    if (status === 'On scene') eta = 0;
    if (status === 'Resolved') eta = 0;

    db.prepare(`
      UPDATE incidents
      SET status = ?,
          eta_minutes = ?,
          resolution_notes = CASE WHEN ? != '' THEN ? ELSE resolution_notes END,
          updated_at = ?
      WHERE id = ?
    `).run(status, eta, notes, notes, now, incident.id);

    // Record timeline
    let details = notes || `Status advanced to ${status}`;
    if (status === 'En route') details = `Responder is travelling to victim location. Updated ETA: ${eta} mins`;
    if (status === 'On scene') details = 'Responder has arrived on scene and initiated protocol';
    if (status === 'Resolved') details = notes ? `Emergency resolved: ${notes}` : 'All parties marked safe and situation under control';

    db.prepare(`
      INSERT INTO incident_timeline (incident_id, label, details, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(incident.id, `Status: ${status}`, details, req.user.name, now);

    addAuditLog(req.user.email, `Incident ${incident.id} updated to ${status}`, details);

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incident.id);
    notifyIncidentUpdate(updated);

    res.json({
      message: `Incident updated to ${status}`,
      incident: updated
    });
  } catch (err) {
    console.error('[Update Status Error]:', err);
    res.status(500).json({ error: 'Failed to update incident status.' });
  }
});

// 9. CANCEL INCIDENT
router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const { reason = 'Accidental or no longer needed' } = req.body;
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    // Only owner of incident or admin can cancel
    if (req.user.role !== 'admin' && incident.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own emergency alerts.' });
    }

    if (['Resolved', 'Cancelled'].includes(incident.status)) {
      return res.status(400).json({ error: `Incident is already ${incident.status}` });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE incidents
      SET status = 'Cancelled',
          cancel_reason = ?,
          updated_at = ?
      WHERE id = ?
    `).run(reason, now, incident.id);

    db.prepare(`
      INSERT INTO incident_timeline (incident_id, label, details, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(incident.id, 'Alert Cancelled', `Cancellation confirmed by ${req.user.name}. Reason: ${reason}`, req.user.name, now);

    addAuditLog(req.user.email, `Incident ${incident.id} cancelled`, `Reason: ${reason}`);

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incident.id);
    notifyIncidentUpdate(updated);

    res.json({
      message: 'Incident cancelled successfully',
      incident: updated
    });
  } catch (err) {
    console.error('[Cancel Incident Error]:', err);
    res.status(500).json({ error: 'Failed to cancel incident.' });
  }
});

// 10. ADMIN MANUAL DISPATCH / REASSIGNMENT
router.post('/:id/dispatch', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { responder_id } = req.body;
    if (!responder_id) {
      return res.status(400).json({ error: 'Responder ID is required for dispatch.' });
    }

    const responder = db.prepare(`
      SELECT u.id, u.name, r.responder_type, r.latitude, r.longitude
      FROM users u
      JOIN responders r ON u.id = r.id
      WHERE u.id = ?
    `).get(responder_id);

    if (!responder) {
      return res.status(404).json({ error: 'Target responder not found.' });
    }

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    const distanceKm = calculateDistance(responder.latitude, responder.longitude, incident.latitude, incident.longitude);
    const etaMinutes = distanceKm ? Math.max(3, Math.round(distanceKm * 2.5)) : 5;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE incidents
      SET status = 'Accepted',
          responder_id = ?,
          responder_name = ?,
          responder_type = ?,
          eta_minutes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(responder.id, responder.name, responder.responder_type, etaMinutes, now, incident.id);

    db.prepare(`
      INSERT INTO incident_timeline (incident_id, label, details, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(incident.id, `Dispatched by Admin to ${responder.name}`, `Manual dispatch priority override (ETA ~${etaMinutes}m)`, req.user.name, now);

    addAuditLog(req.user.email, `Admin dispatched incident ${incident.id} to ${responder.name}`, `Responder Type: ${responder.responder_type}`);

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incident.id);
    notifyIncidentUpdate(updated);

    res.json({
      message: 'Responder successfully dispatched to incident',
      incident: updated
    });
  } catch (err) {
    console.error('[Dispatch Error]:', err);
    res.status(500).json({ error: 'Failed to dispatch responder.' });
  }
});

// 11. CHAT MESSAGES
router.get('/:id/messages', requireAuth, (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT * FROM incident_messages
      WHERE incident_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ messages });
  } catch (err) {
    console.error('[Get Messages Error]:', err);
    res.status(500).json({ error: 'Failed to fetch incident messages.' });
  }
});

router.post('/:id/messages', requireAuth, (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO incident_messages (incident_id, sender_id, sender_name, sender_role, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(incident.id, req.user.id, req.user.name, req.user.role, message.trim(), now);

    const chatMessage = {
      id: Number(result.lastInsertRowid),
      incident_id: incident.id,
      sender_id: req.user.id,
      sender_name: req.user.name,
      sender_role: req.user.role,
      message: message.trim(),
      created_at: now
    };

    notifyChatMessage(incident.id, chatMessage);

    res.status(201).json({ message: chatMessage });
  } catch (err) {
    console.error('[Post Message Error]:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

export default router;
