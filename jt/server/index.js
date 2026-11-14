import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { setupWebSocket } from './websocket.js';

import authRoutes from './routes/authRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import responderRoutes from './routes/responderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB tables and seed data
initDatabase();

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
setupWebSocket(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/responders', responderRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'JATAYU Emergency Response System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for React Router single page app
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('JATAYU API Server is running. In dev mode, please access via Vite dev server at http://localhost:5173');
    }
  });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🛡️  JATAYU Emergency Response Backend Running`);
  console.log(`  🚀  HTTP & API: http://localhost:${PORT}/api/health`);
  console.log(`  ⚡  WebSocket:  ws://localhost:${PORT}/ws`);
  console.log(`====================================================`);
});
