import express from 'express';
import { db, addAuditLog } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

// 1. GET ALL USER CONTACTS
router.get('/', requireAuth, (req, res) => {
  try {
    const contacts = db.prepare(`
      SELECT * FROM contacts
      WHERE user_id = ?
      ORDER BY created_at ASC
    `).all(req.user.id);

    res.json({ contacts });
  } catch (err) {
    console.error('[Get Contacts Error]:', err);
    res.status(500).json({ error: 'Failed to fetch emergency contacts.' });
  }
});

// 2. ADD CONTACT
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, phone, relationship = 'Emergency Contact' } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Contact name and phone number are required.' });
    }

    const id = 'cnt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO contacts (id, user_id, name, phone, relationship, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'Verified', ?)
    `).run(id, req.user.id, name.trim(), phone.trim(), relationship.trim(), now);

    addAuditLog(req.user.email, `Added emergency contact: ${name}`, `Phone: ${phone}`);

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    res.status(201).json({
      message: 'Emergency contact added',
      contact
    });
  } catch (err) {
    console.error('[Add Contact Error]:', err);
    res.status(500).json({ error: 'Failed to add contact.' });
  }
});

// 3. DELETE CONTACT
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found or unauthorized.' });
    }

    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    addAuditLog(req.user.email, `Removed emergency contact: ${contact.name}`, '');

    res.json({ message: 'Emergency contact removed successfully' });
  } catch (err) {
    console.error('[Delete Contact Error]:', err);
    res.status(500).json({ error: 'Failed to delete contact.' });
  }
});

// 4. SIMULATE EMERGENCY BROADCAST TO CONTACTS
router.post('/alert', requireAuth, (req, res) => {
  try {
    const { incidentId, location } = req.body;
    const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(req.user.id);

    if (contacts.length === 0) {
      return res.json({
        dispatchedCount: 0,
        message: 'No contacts configured to receive SMS.'
      });
    }

    const coordinatesStr = location ? `${location.latitude}, ${location.longitude}` : 'Indiranagar, Bengaluru';
    const trackingUrl = `http://localhost:5173/incident/${incidentId || 'active'}`;

    addAuditLog(req.user.email, `SMS dispatched to ${contacts.length} trusted contacts`, `Alert link: ${trackingUrl}`);

    res.json({
      dispatchedCount: contacts.length,
      contacts: contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        status: 'Sent via SMS Gateway',
        messagePreview: `EMERGENCY ALERT from ${req.user.name}: I need urgent help at ${coordinatesStr}. Track my live situation here: ${trackingUrl}`
      }))
    });
  } catch (err) {
    console.error('[Broadcast Alert Error]:', err);
    res.status(500).json({ error: 'Failed to broadcast alert to contacts.' });
  }
});

export default router;
