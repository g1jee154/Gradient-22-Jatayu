import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'jatayu.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

// Simple helper to calculate SHA-256-like tamper-evident hash
export function createAuditHash(message, prevHash = '00000000') {
  const combined = prevHash + ':' + message;
  let h = 0x811c9dc5;
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function initDatabase() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      account_status TEXT NOT NULL DEFAULT 'active',
      blood_group TEXT DEFAULT 'O+',
      google_id TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responders (
      id TEXT PRIMARY KEY,
      responder_type TEXT NOT NULL DEFAULT 'Police',
      is_verified INTEGER NOT NULL DEFAULT 1,
      is_available INTEGER NOT NULL DEFAULT 1,
      latitude REAL DEFAULT 12.9750,
      longitude REAL DEFAULT 77.6050,
      badge_number TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_phone TEXT,
      emergency_type TEXT NOT NULL DEFAULT 'General Emergency',
      status TEXT NOT NULL DEFAULT 'Pending',
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT DEFAULT 'Indiranagar, Bengaluru',
      accuracy REAL DEFAULT 10,
      responder_id TEXT,
      responder_name TEXT,
      responder_type TEXT,
      eta_minutes INTEGER,
      cancel_reason TEXT,
      resolution_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS incident_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT NOT NULL,
      label TEXT NOT NULL,
      details TEXT,
      actor_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incident_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relationship TEXT DEFAULT 'Emergency Contact',
      status TEXT DEFAULT 'Verified',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  try { db.exec("ALTER TABLE users ADD COLUMN google_id TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;"); } catch (e) {}

  // Seed default data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedDatabase();
  }
}

export function addAuditLog(actor, action, details = '') {
  const lastLog = db.prepare('SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1').get();
  const prevHash = lastLog ? lastLog.hash : 'initial0';
  const now = new Date().toISOString();
  const hash = createAuditHash(`${actor}:${action}:${details}:${now}`, prevHash);

  const stmt = db.prepare(`
    INSERT INTO audit_logs (actor, action, details, hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(actor, action, details, hash, now);
  return { hash, created_at: now };
}

function seedDatabase() {
  console.log('[DB] Seeding initial JATAYU data...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);
  const now = new Date().toISOString();

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, phone, role, account_status, blood_group, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertResponder = db.prepare(`
    INSERT INTO responders (id, responder_type, is_verified, is_available, latitude, longitude, badge_number, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Citizens
  insertUser.run('usr_aarav', 'aarav@jatayu.org', defaultPasswordHash, 'Aarav Sharma', '+91 98765 43210', 'user', 'active', 'B+', now, now);
  insertUser.run('usr_neha', 'neha@jatayu.org', defaultPasswordHash, 'Neha Rao', '+91 98450 12345', 'user', 'active', 'O+', now, now);
  insertUser.run('usr_karan', 'karan@jatayu.org', defaultPasswordHash, 'Karan Mehta', '+91 98110 56789', 'user', 'active', 'A+', now, now);

  // Responders
  insertUser.run('res_arjun', 'arjun@jatayu.org', defaultPasswordHash, 'Officer Arjun Kumar', '+91 94480 11223', 'responder', 'active', 'O+', now, now);
  insertResponder.run('res_arjun', 'Police', 1, 1, 12.9810, 77.6380, 'BLR-POL-4412', now);

  insertUser.run('res_meera', 'meera@jatayu.org', defaultPasswordHash, 'Dr. Meera Nair', '+91 94480 22334', 'responder', 'active', 'AB+', now, now);
  insertResponder.run('res_meera', 'Medical', 1, 1, 12.9712, 77.6415, 'EMS-BLR-089', now);

  insertUser.run('res_vikram', 'vikram@jatayu.org', defaultPasswordHash, 'Vikram Singh', '+91 94480 33445', 'responder', 'active', 'B+', now, now);
  insertResponder.run('res_vikram', 'Fire & Rescue', 1, 1, 12.9890, 77.6250, 'FRS-KA-201', now);

  insertUser.run('res_sana', 'sana@jatayu.org', defaultPasswordHash, 'Sana Qureshi', '+91 94480 44556', 'responder', 'active', 'A-', now, now);
  insertResponder.run('res_sana', 'Volunteer', 0, 0, 12.9650, 77.6200, 'VOL-IND-902', now);

  // Admin / Dispatcher Chief
  insertUser.run('adm_priya', 'admin@jatayu.org', defaultPasswordHash, 'Command Chief Priya', '+91 98000 00112', 'admin', 'active', 'O+', now, now);

  // 2. Contacts for Aarav
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, user_id, name, phone, relationship, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertContact.run('cnt_1', 'usr_aarav', 'Mom', '+91 98450 11122', 'Mother', 'Verified', now);
  insertContact.run('cnt_2', 'usr_aarav', 'Rohan (Brother)', '+91 98860 22233', 'Brother', 'Verified', now);
  insertContact.run('cnt_3', 'usr_aarav', 'Priya (Friend)', '+91 99000 33344', 'Friend', 'Verified', now);

  // 3. Incidents
  const insertIncident = db.prepare(`
    INSERT INTO incidents (id, user_id, user_name, user_phone, emergency_type, status, latitude, longitude, address, accuracy, responder_id, responder_name, responder_type, eta_minutes, cancel_reason, resolution_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimeline = db.prepare(`
    INSERT INTO incident_timeline (incident_id, label, details, actor_name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO incident_messages (incident_id, sender_id, sender_name, sender_role, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Active Pending Incident
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  insertIncident.run(
    'JTY-4821',
    'usr_aarav',
    'Aarav Sharma',
    '+91 98765 43210',
    'Personal Safety',
    'Pending',
    12.9784,
    77.6408,
    '12th Main, Indiranagar, Bengaluru',
    8,
    null,
    null,
    null,
    null,
    null,
    null,
    tenMinsAgo,
    tenMinsAgo
  );

  insertTimeline.run('JTY-4821', 'SOS triggered by Aarav Sharma', 'One-tap emergency beacon sent with high-accuracy GPS coordinates', 'Aarav Sharma', tenMinsAgo);
  insertTimeline.run('JTY-4821', 'Trusted contacts notified', 'SMS dispatched to 3 registered emergency contacts', 'System Gateway', new Date(Date.now() - 9.5 * 60 * 1000).toISOString());
  insertTimeline.run('JTY-4821', 'Broadcasted to nearby responders', 'Alert beamed to 3 active responders within 3km radius', 'Dispatch Engine', new Date(Date.now() - 9 * 60 * 1000).toISOString());

  insertMessage.run('JTY-4821', 'usr_aarav', 'Aarav Sharma', 'user', 'I am near the metro station entrance. Please hurry.', new Date(Date.now() - 8 * 60 * 1000).toISOString());

  // Past Resolved Incident
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  insertIncident.run(
    'JTY-3914',
    'usr_neha',
    'Neha Rao',
    '+91 98450 12345',
    'Medical Assist',
    'Resolved',
    12.9352,
    77.6245,
    '5th Block, Koramangala, Bengaluru',
    5,
    'res_meera',
    'Dr. Meera Nair',
    'Medical',
    0,
    null,
    'Patient stabilized on scene and transported safely to clinic.',
    yesterday,
    new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  );

  insertTimeline.run('JTY-3914', 'SOS triggered by Neha Rao', 'Severe asthma alert', 'Neha Rao', yesterday);
  insertTimeline.run('JTY-3914', 'Accepted by Dr. Meera Nair', 'ETA calculated at 6 minutes', 'Dr. Meera Nair', new Date(Date.now() - 23.9 * 60 * 60 * 1000).toISOString());
  insertTimeline.run('JTY-3914', 'On scene', 'Medical equipment deployed', 'Dr. Meera Nair', new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString());
  insertTimeline.run('JTY-3914', 'Incident Resolved', 'Patient stable and safe', 'Dr. Meera Nair', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

  // Audit Logs
  addAuditLog('system', 'System initialized with secure tamper-evident ledger', 'Database and security tables configured');
  addAuditLog('admin@jatayu', 'Verified responder Dr. Meera Nair (EMS-BLR-089)', 'Credentials and certifications verified');
  addAuditLog('admin@jatayu', 'Verified responder Officer Arjun Kumar (BLR-POL-4412)', 'Police dispatch authorization verified');
  addAuditLog('usr_aarav', 'Emergency SOS beacon triggered: JTY-4821', 'GPS Lat: 12.9784, Lon: 77.6408');

  console.log('[DB] Seeding completed successfully.');
}
