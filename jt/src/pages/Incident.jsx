import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shell,
  Card,
  Badge,
  Button,
  LocationPanel
} from '../components/UI';
import MapPanel from '../components/MapPanel';
import { incidentsApi } from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, ShieldAlert, Phone, Navigation } from 'lucide-react';

export default function Incident() {
  const { id } = useParams();
  const nav = useNavigate();
  const { userProfile } = useAuth();

  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [messages, setMessages] = useState([]);
  const [responder, setResponder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('Accidental trigger or situation safe');
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadIncident = useCallback(async () => {
    try {
      setLoading(true);
      let targetId = id;

      // If no ID is provided, look up user's active incident
      if (!targetId) {
        const myIncidents = await incidentsApi.getMyIncidents();
        const active = myIncidents.incidents?.find((i) =>
          ['Pending', 'Accepted', 'En route', 'On scene'].includes(i.status)
        ) || myIncidents.incidents?.[0];

        if (active) {
          targetId = active.id;
        } else {
          setLoading(false);
          return;
        }
      }

      const data = await incidentsApi.getById(targetId);
      setIncident(data.incident);
      setTimeline(data.timeline || []);
      setMessages(data.messages || []);
      setResponder(data.responder || null);

      // Join real-time room for this incident
      socket.joinRoom(`incident:${targetId}`);
    } catch (err) {
      console.error('Error fetching incident:', err);
      setError(err.message || 'Incident not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadIncident();

    // Real-time incident updates
    const unsubUpdate = socket.on('incident_updated', (data) => {
      if (data.incident?.id === incident?.id || data.incident?.id === id) {
        setIncident(data.incident);
        // Refresh details
        incidentsApi.getById(data.incident.id).then((fresh) => {
          setTimeline(fresh.timeline || []);
          setResponder(fresh.responder || null);
        }).catch(() => {});
      }
    });

    // Real-time chat messages
    const unsubChat = socket.on('chat_message', (data) => {
      if (data.incidentId === incident?.id || data.incidentId === id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(scrollToBottom, 100);
      }
    });

    return () => {
      unsubUpdate();
      unsubChat();
      if (incident?.id) {
        socket.leaveRoom(`incident:${incident.id}`);
      }
    };
  }, [loadIncident, incident?.id, id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cancel Incident
  async function handleCancel() {
    if (!incident) return;
    try {
      await incidentsApi.cancel(incident.id, cancelReason);
      setConfirmCancel(false);
      loadIncident();
    } catch (err) {
      setError(err.message || 'Failed to cancel incident.');
    }
  }

  // Send Chat Message
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim() || !incident) return;
    setSendingMsg(true);
    try {
      const res = await incidentsApi.sendMessage(incident.id, chatInput.trim());
      setMessages((prev) => [...prev, res.message]);
      setChatInput('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  }

  if (loading) {
    return (
      <Shell title="Active Emergency Incident">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p className="muted">Connecting to JATAYU telemetry & loading live incident...</p>
        </div>
      </Shell>
    );
  }

  if (!incident) {
    return (
      <Shell title="Active Incident Tracker">
        <Card>
          <h3>No Active Emergency</h3>
          <p className="muted">
            You currently have no emergency alerts in progress. Return to your dashboard to activate SOS protection if needed.
          </p>
          <Button onClick={() => nav('/user')} style={{ marginTop: '14px' }}>
            Back to Dashboard
          </Button>
        </Card>
      </Shell>
    );
  }

  const isResolvedOrCancelled = ['Resolved', 'Cancelled'].includes(incident.status);

  // Status badge styling
  let badgeType = 'red';
  if (incident.status === 'Accepted' || incident.status === 'En route') badgeType = 'blue';
  if (incident.status === 'On scene') badgeType = 'amber';
  if (incident.status === 'Resolved') badgeType = 'green';
  if (incident.status === 'Cancelled') badgeType = 'gray';

  return (
    <Shell title="Emergency In Progress">
      <div className="top-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge type={badgeType}>
            {!isResolvedOrCancelled && (
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#fff', marginRight: '6px', animation: 'ping 1.5s infinite' }}></span>
            )}
            ● {incident.status.toUpperCase()}
          </Badge>
          <b style={{ fontSize: '16px' }}>{incident.id} · {incident.emergency_type}</b>
        </div>
        <span className="muted" style={{ fontSize: '13px' }}>
          Live Satellite & GPS Link
        </span>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="incident-grid">
        {/* TIME CARD */}
        <Card title="Incident Timestamp">
          <h2>{new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</h2>
          <small className="muted">{new Date(incident.created_at).toLocaleDateString()}</small>
        </Card>

        {/* LOCATION CARD */}
        <Card title="Live Coordinates">
          <LocationPanel location={{ latitude: incident.latitude, longitude: incident.longitude, address: incident.address }} />
        </Card>

        {/* STATUS SUMMARY */}
        <Card title="Dispatcher Escalation">
          <Badge type="blue">● GPS Telemetry Active</Badge>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--muted, #94a3b8)' }}>
            Contacts notified · Nearby response units alerted
          </p>
        </Card>

        {/* LIVE MAP */}
        <Card title="Live Response Navigation Map" className="wide">
          <MapPanel
            location={{ latitude: incident.latitude, longitude: incident.longitude }}
            responderLocation={responder ? {
              latitude: responder.latitude,
              longitude: responder.longitude,
              name: responder.name,
              role: responder.responder_type
            } : null}
            showRoute={true}
            zoom={14}
            height="340px"
          />
        </Card>

        {/* RESPONSE COORDINATION */}
        <Card title="Response Coordination">
          <small className="muted" style={{ display: 'block', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
            Assigned Field Unit
          </small>
          <h3 style={{ margin: '4px 0 8px', fontSize: '18px' }}>
            {incident.responder_name ? `${incident.responder_name}` : 'Searching nearby responders...'}
          </h3>

          {responder && (
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#38bdf8' }}>
                Unit: {responder.responder_type} · {responder.badge_number}
              </p>
              {responder.phone && (
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} /> {responder.phone}
                </p>
              )}
              {incident.eta_minutes !== null && incident.status !== 'Resolved' && (
                <p style={{ margin: '4px 0 0', color: '#22c55e', fontWeight: 600 }}>
                  Estimated Arrival: ~{incident.eta_minutes} mins
                </p>
              )}
            </div>
          )}

          <Badge type={badgeType}>{incident.status}</Badge>

          {incident.resolution_notes && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '6px', fontSize: '13px' }}>
              <b>Resolution:</b> {incident.resolution_notes}
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <Button
              variant="danger"
              onClick={() => setConfirmCancel(true)}
              disabled={isResolvedOrCancelled}
              style={{ width: '100%', opacity: isResolvedOrCancelled ? 0.5 : 1 }}
            >
              Cancel Emergency Alert
            </Button>
          </div>
        </Card>

        {/* LIVE SECURE CHAT */}
        <Card title="Live Incident Dispatch Chat" className="wide">
          <div style={{
            height: '220px',
            overflowY: 'auto',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {messages.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', margin: 'auto' }}>
                No messages yet. Send a message to communicate with responders and dispatch.
              </p>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === userProfile?.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: isMe ? '#0284c7' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>
                      <b>{m.sender_name} ({m.sender_role})</b>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>{m.message}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to responder & command center..."
              disabled={isResolvedOrCancelled || sendingMsg}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '13px'
              }}
            />
            <Button type="submit" disabled={isResolvedOrCancelled || sendingMsg || !chatInput.trim()}>
              <Send size={15} style={{ marginRight: '4px' }} />
              Send
            </Button>
          </form>
        </Card>

        {/* TIMELINE */}
        <Card title="Incident Event Timeline" className="wide">
          <div className="timeline">
            {timeline.length > 0 ? (
              timeline.map((item, idx) => (
                <div key={item.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ color: 'var(--red, #ef4444)', fontSize: '18px', lineHeight: 1 }}>●</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: '14px' }}>{item.label}</b>
                      <small style={{ color: 'var(--muted, #94a3b8)' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                    {item.details && (
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted, #94a3b8)' }}>
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No timeline events recorded.</p>
            )}
          </div>
        </Card>
      </div>

      {/* CONFIRM CANCELLATION MODAL */}
      {confirmCancel && (
        <div className="modal-backdrop">
          <div className="card modal">
            <h2>Cancel Emergency Alert?</h2>
            <p className="muted">
              Only cancel if you are safe and no longer require field assistance.
            </p>

            <label style={{ display: 'block', margin: '14px 0' }}>
              Reason for cancellation:
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Accidental click / Situation safely de-escalated"
                style={{ marginTop: '6px' }}
              />
            </label>

            <div className="button-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Keep Alert Active
              </Button>
              <Button variant="danger" onClick={handleCancel}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
