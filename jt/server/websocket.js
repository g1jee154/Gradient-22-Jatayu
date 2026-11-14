import { WebSocketServer } from 'ws';
import { verifyToken } from './auth.js';

let wss = null;
// Store active connections and their room memberships: Map<WebSocket, Set<string>>
const clientRooms = new Map();
// Store user info per socket: Map<WebSocket, object>
const clientUser = new Map();

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    clientRooms.set(ws, new Set(['public']));

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'auth' && data.token) {
          const user = verifyToken(data.token);
          if (user) {
            clientUser.set(ws, user);
            const rooms = clientRooms.get(ws);
            if (user.role === 'responder') {
              rooms.add('responder_feed');
            }
            if (user.role === 'admin') {
              rooms.add('admin_feed');
              rooms.add('responder_feed');
            }
            ws.send(JSON.stringify({ type: 'authenticated', user: { id: user.id, role: user.role, name: user.name } }));
          }
        }

        if (data.type === 'subscribe' && data.room) {
          const rooms = clientRooms.get(ws);
          if (rooms) rooms.add(data.room);
          ws.send(JSON.stringify({ type: 'subscribed', room: data.room }));
        }

        if (data.type === 'unsubscribe' && data.room) {
          const rooms = clientRooms.get(ws);
          if (rooms) rooms.delete(data.room);
        }

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err.message);
      }
    });

    ws.on('close', () => {
      clientRooms.delete(ws);
      clientUser.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client socket error:', err.message);
    });

    // Send welcome
    ws.send(JSON.stringify({ type: 'connected', serverTime: new Date().toISOString() }));
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

export function broadcastToRoom(room, messageObj) {
  if (!wss) return;
  const payload = JSON.stringify(messageObj);
  for (const [ws, rooms] of clientRooms.entries()) {
    if (rooms.has(room) && ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastAll(messageObj) {
  if (!wss) return;
  const payload = JSON.stringify(messageObj);
  for (const [ws] of clientRooms.entries()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

export function notifyNewEmergency(incident) {
  broadcastToRoom('responder_feed', { type: 'new_emergency', incident });
  broadcastToRoom('admin_feed', { type: 'new_emergency', incident });
}

export function notifyIncidentUpdate(incident) {
  broadcastToRoom(`incident:${incident.id}`, { type: 'incident_updated', incident });
  broadcastToRoom('responder_feed', { type: 'incident_updated', incident });
  broadcastToRoom('admin_feed', { type: 'incident_updated', incident });
}

export function notifyChatMessage(incidentId, chatMessage) {
  broadcastToRoom(`incident:${incidentId}`, { type: 'chat_message', incidentId, message: chatMessage });
  broadcastToRoom('admin_feed', { type: 'chat_message', incidentId, message: chatMessage });
}

export function notifyResponderUpdate(responder) {
  broadcastToRoom('admin_feed', { type: 'responder_updated', responder });
  broadcastToRoom('responder_feed', { type: 'responder_updated', responder });
}
