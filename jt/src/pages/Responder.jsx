import React, { useEffect, useState, useCallback } from 'react';
import {
  Shell,
  Card,
  Badge,
  Button,
  Stat,
  Connectivity
} from '../components/UI';
import MapPanel from '../components/MapPanel';
import { useAuth } from '../context/AuthContext';
import { incidentsApi, respondersApi } from '../services/api';
import { socket } from '../services/socket';
import { Radio, Navigation, CheckCircle, Phone, Send, AlertTriangle, Shield } from 'lucide-react';

export default function Responder() {
  const { userProfile } = useAuth();

  const [available, setAvailable] = useState(true);
  const [pending, setPending] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [stats, setStats] = useState({ resolvedCount: 0, activeCount: 0, avgEtaMinutes: 4.8 });
  const [loc, setLoc] = useState({ latitude: 12.9810, longitude: 77.6380 });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const responderBranch = userProfile?.responder?.responder_type || 'Emergency Responder';
  const badgeNumber = userProfile?.responder?.badge_number || 'JTY-RESP-01';

  // Load Initial Responder Data
  const loadResponderData = useCallback(async () => {
    try {
      const [pendingRes, assignedRes, statsRes] = await Promise.all([
        incidentsApi.getPending(),
        incidentsApi.getAssigned(),
        respondersApi.getStats().catch(() => ({ resolvedCount: 1, activeCount: 0, avgEtaMinutes: 4.8 }))
      ]);

      setPending(pendingRes.incidents || []);
      const myAssigned = assignedRes.incidents || [];
      setAssigned(myAssigned);
      setStats(statsRes);

      // Select active incident if any
      const active = myAssigned.find((i) => ['Accepted', 'En route', 'On scene'].includes(i.status));
      setActiveIncident(active || null);

      if (active) {
        socket.joinRoom(`incident:${active.id}`);
        incidentsApi.getMessages(active.id).then((res) => setMessages(res.messages || [])).catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching responder data:', err);
    }
  }, []);

  useEffect(() => {
    loadResponderData();

    // Get current responder GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {},
        { timeout: 5000 }
      );
    }

    // Subscribe to new emergency alerts
    const unsubNew = socket.on('new_emergency', (data) => {
      setPending((prev) => {
        if (prev.some((p) => p.id === data.incident.id)) return prev;
        return [data.incident, ...prev];
      });
      setSuccessMsg(`🚨 NEW EMERGENCY ALERT: ${data.incident.id} (${data.incident.emergency_type})`);
      setTimeout(() => setSuccessMsg(''), 5000);
    });

    // Subscribe to incident updates
    const unsubUpdate = socket.on('incident_updated', (data) => {
      // If someone else accepted or it cancelled, remove from pending
      if (data.incident.status !== 'Pending') {
        setPending((prev) => prev.filter((p) => p.id !== data.incident.id));
      }

      setAssigned((prev) =>
        prev.map((i) => (i.id === data.incident.id ? data.incident : i))
      );

      setActiveIncident((cur) => {
        if (cur && cur.id === data.incident.id) {
          return data.incident.status === 'Resolved' || data.incident.status === 'Cancelled' ? null : data.incident;
        }
        return cur;
      });
    });

    // Chat messages
    const unsubChat = socket.on('chat_message', (data) => {
      if (activeIncident && data.incidentId === activeIncident.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => {
      unsubNew();
      unsubUpdate();
      unsubChat();
    };
  }, [loadResponderData, activeIncident?.id]);

  // Toggle Availability
  async function toggleAvailability() {
    try {
      const newStatus = !available;
      await respondersApi.updateAvailability(newStatus, loc.latitude, loc.longitude);
      setAvailable(newStatus);
      setSuccessMsg(`Availability updated to ${newStatus ? 'Online & Available' : 'Offline / Standby'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to update availability.');
    }
  }

  // Accept Emergency
  async function handleAccept(incident) {
    try {
      setError('');
      const res = await incidentsApi.accept(incident.id);
      setActiveIncident(res.incident);
      setPending((prev) => prev.filter((p) => p.id !== incident.id));
      setAssigned((prev) => [res.incident, ...prev]);

      // Join chat room
      socket.joinRoom(`incident:${res.incident.id}`);
      incidentsApi.getMessages(res.incident.id).then((r) => setMessages(r.messages || [])).catch(() => {});

      setSuccessMsg(`Emergency ${incident.id} accepted. You are now assigned.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to accept emergency.');
    }
  }

  // Decline Emergency
  function handleDecline(incidentId) {
    setPending((prev) => prev.filter((p) => p.id !== incidentId));
  }

  // Advance Status (En route -> On scene)
  async function handleStatusChange(nextStatus) {
    if (!activeIncident) return;
    try {
      const res = await incidentsApi.updateStatus(activeIncident.id, nextStatus);
      setActiveIncident(res.incident);
      setAssigned((prev) => prev.map((i) => (i.id === res.incident.id ? res.incident : i)));
      setSuccessMsg(`Status updated to ${nextStatus}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  }

  // Resolve Emergency
  async function handleResolveSubmit(e) {
    e.preventDefault();
    if (!activeIncident) return;
    try {
      const res = await incidentsApi.updateStatus(activeIncident.id, 'Resolved', resolutionNotes || 'Situation stabilized and verified safe.');
      setActiveIncident(null);
      setShowResolveModal(false);
      setResolutionNotes('');
      setAssigned((prev) => prev.map((i) => (i.id === res.incident.id ? res.incident : i)));
      setStats((s) => ({ ...s, resolvedCount: s.resolvedCount + 1 }));
      setSuccessMsg(`Incident ${res.incident.id} resolved successfully! Report filed.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to resolve incident.');
    }
  }

  // Send Chat Message
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim() || !activeIncident) return;
    try {
      const res = await incidentsApi.sendMessage(activeIncident.id, chatInput.trim());
      setMessages((prev) => [...prev, res.message]);
      setChatInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  const completed = assigned.filter((i) => i.status === 'Resolved');

  return (
    <Shell title="Responder Command Console">
      <div className="top-line">
        <p className="muted">
          Active Patrol: {userProfile?.name} · {responderBranch} ({badgeNumber})
        </p>
        <Connectivity />
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#22c55e', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* AVAILABILITY BAR */}
      <Card className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Responder Dispatch Availability</h3>
          <p className="muted small" style={{ margin: 0 }}>
            {available
              ? 'You are active and receiving live emergency broadcasts.'
              : 'You are on break/off-duty. Incoming emergency alerts are silenced.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Badge type={available ? 'green' : 'gray'}>
            ● {available ? 'ONLINE & ACTIVE' : 'OFFLINE'}
          </Badge>
          <Button
            variant={available ? 'outline' : ''}
            onClick={toggleAvailability}
            style={{ fontSize: '13px' }}
          >
            {available ? 'Go Offline' : 'Go Online'}
          </Button>
        </div>
      </Card>

      {/* KPI METRICS */}
      <div className="stats-grid four" style={{ marginBottom: '20px' }}>
        <Stat label="Branch Unit" value={responderBranch} type="blue" />
        <Stat label="Pending Requests" value={pending.length} type={pending.length > 0 ? 'red' : 'blue'} />
        <Stat label="Active Assignment" value={activeIncident ? activeIncident.id : 'None'} type={activeIncident ? 'amber' : 'blue'} />
        <Stat label="Resolved Incidents" value={stats.resolvedCount || completed.length} type="green" />
      </div>

      <div className="two-col">
        {/* INCOMING EMERGENCY ALERTS QUEUE */}
        <Card title={`Incoming Emergency Broadcasts (${pending.length})`}>
          {!available ? (
            <p className="muted">You are currently offline. Switch your status to Online to receive live distress calls.</p>
          ) : pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted, #94a3b8)' }}>
              <Shield size={36} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p style={{ margin: 0 }}>No pending emergencies in your patrol sector.</p>
              <small>System is continuously monitoring broadcast frequency.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pending.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ color: '#ef4444', fontSize: '15px' }}>
                      {req.id} · {req.emergency_type}
                    </b>
                    <small className="muted">
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px' }}>
                    <b>Victim:</b> {req.user_name} {req.user_phone ? `(${req.user_phone})` : ''}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted, #94a3b8)' }}>
                    📍 {req.address} ({req.latitude?.toFixed(4)}, {req.longitude?.toFixed(4)})
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                    ⚡ Distance: ~{req.distance_km || 1.2} km · ETA ~{req.eta_minutes || 5} mins
                  </p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <Button
                      onClick={() => handleAccept(req)}
                      disabled={!!activeIncident}
                      style={{ background: '#22c55e', color: '#fff', fontSize: '13px', padding: '6px 14px' }}
                    >
                      Accept Emergency →
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(req.id)}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ACTIVE ASSIGNMENT CONSOLE */}
        <Card title="Active Incident Navigation & Management">
          {activeIncident ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <b style={{ fontSize: '16px', color: '#38bdf8' }}>{activeIncident.id} · {activeIncident.emergency_type}</b>
                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>
                    Victim: <b>{activeIncident.user_name}</b> {activeIncident.user_phone ? `· ${activeIncident.user_phone}` : ''}
                  </p>
                </div>
                <Badge type="blue">● {activeIncident.status}</Badge>
              </div>

              {/* Navigation button */}
              <div style={{ marginBottom: '14px', display: 'flex', gap: '8px' }}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeIncident.latitude},${activeIncident.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{ textDecoration: 'none', background: '#0284c7', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
                >
                  <Navigation size={15} />
                  Open Turn-by-Turn GPS Directions
                </a>
              </div>

              {/* Map */}
              <div style={{ height: '240px', marginBottom: '16px' }}>
                <MapPanel
                  location={{ latitude: activeIncident.latitude, longitude: activeIncident.longitude }}
                  responderLocation={{ latitude: loc.latitude, longitude: loc.longitude, name: userProfile?.name, role: responderBranch }}
                  showRoute={true}
                  zoom={14}
                  height="240px"
                />
              </div>

              {/* Lifecycle progression buttons */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                  Update Emergency Lifecycle
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    variant={activeIncident.status === 'Accepted' ? '' : 'outline'}
                    disabled={activeIncident.status !== 'Accepted'}
                    onClick={() => handleStatusChange('En route')}
                    style={{ fontSize: '12px' }}
                  >
                    1. Mark En Route →
                  </Button>

                  <Button
                    variant={activeIncident.status === 'En route' ? '' : 'outline'}
                    disabled={activeIncident.status !== 'En route'}
                    onClick={() => handleStatusChange('On scene')}
                    style={{ fontSize: '12px' }}
                  >
                    2. Mark On Scene →
                  </Button>

                  <Button
                    style={{ background: '#22c55e', color: '#fff', fontSize: '12px' }}
                    onClick={() => setShowResolveModal(true)}
                  >
                    3. Resolve Incident ✓
                  </Button>
                </div>
              </div>

              {/* Secure Chat with Victim */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Dispatch & Victim Communication</h4>
                <div style={{ height: '140px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {messages.length === 0 ? (
                    <small className="muted" style={{ margin: 'auto' }}>No messages yet.</small>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} style={{ fontSize: '12px', background: m.sender_role === 'responder' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.08)', padding: '6px 10px', borderRadius: '6px' }}>
                        <b>{m.sender_name}:</b> {m.message}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message victim / dispatcher..."
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Button type="submit" style={{ padding: '8px 12px', fontSize: '12px' }}>
                    <Send size={13} />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted, #94a3b8)' }}>
              <p>You have no active incident assigned right now.</p>
              <small>Accept an incoming emergency request from the queue to start navigation.</small>
            </div>
          )}
        </Card>
      </div>

      {/* COMPLETED INCIDENTS TABLE */}
      <Card title="Completed Emergency Responses" style={{ marginTop: '20px' }}>
        <div className="list">
          {completed.length > 0 ? (
            completed.map((item) => (
              <div className="list-row" key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>{item.id} · {item.emergency_type}</b>
                  <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                    Victim: {item.user_name} · {item.address} · {new Date(item.updated_at).toLocaleString()}
                  </small>
                  {item.resolution_notes && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#22c55e' }}>
                      Report: {item.resolution_notes}
                    </p>
                  )}
                </div>
                <Badge type="green">Resolved</Badge>
              </div>
            ))
          ) : (
            <p className="muted">No completed incidents recorded during this tour.</p>
          )}
        </div>
      </Card>

      {/* RESOLUTION REPORT MODAL */}
      {showResolveModal && (
        <div className="modal-backdrop">
          <div className="card modal">
            <h2>Complete Incident Resolution</h2>
            <p className="muted">Submit the field report to officially close this emergency.</p>
            <form onSubmit={handleResolveSubmit}>
              <label>
                Field Resolution Notes
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Victim escorted to safety / First aid administered / Area secured."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    marginTop: '6px'
                  }}
                />
              </label>

              <div className="button-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <Button type="button" variant="outline" onClick={() => setShowResolveModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ background: '#22c55e', color: '#fff' }}>
                  Confirm Resolution
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
