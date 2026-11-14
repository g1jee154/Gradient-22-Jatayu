class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.rooms = new Set();
    this.isConnected = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev Vite proxy forwards /ws to backend port 5050
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Authenticate if token exists
        const token = localStorage.getItem('jatayu_token');
        if (token) {
          this.send({ type: 'auth', token });
        }

        // Resubscribe to existing rooms
        for (const room of this.rooms) {
          this.send({ type: 'subscribe', room });
        }

        this.startHeartbeat();
        this.emit('_connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.emit(data.type, data);
          }
          this.emit('*', data);
        } catch (err) {
          console.error('[WS Error parsing message]:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('_connection', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Socket Warning]:', err.message || 'connection error');
      };
    } catch (e) {
      console.warn('[WS Connection Failed]:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  joinRoom(room) {
    this.rooms.add(room);
    this.send({ type: 'subscribe', room });
  }

  leaveRoom(room) {
    this.rooms.delete(room);
    this.send({ type: 'unsubscribe', room });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    const subs = this.listeners.get(event);
    if (subs) {
      for (const cb of subs) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WS Listener Error for ${event}]:`, err);
        }
      }
    }
  }
}

export const socket = new WebSocketService();
