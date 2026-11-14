import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, History, Plus, Trash2, Send, ShieldAlert, CheckCircle, MapPin } from 'lucide-react';

import {
  Shell,
  Card,
  Button,
  Badge,
  Connectivity,
  LocationPanel
} from '../components/UI';

import MapPanel from '../components/MapPanel';
import { useAuth } from '../context/AuthContext';
import { incidentsApi, contactsApi, respondersApi } from '../services/api';
import { socket } from '../services/socket';

export default function User() {
  const { userProfile } = useAuth();
  const nav = useNavigate();

  const [loc, setLoc] = useState({ latitude: 12.9784, longitude: 77.6408, address: '12th Main, Indiranagar, Bengaluru' });
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [responders, setResponders] = useState([]);
  const [emergencyType, setEmergencyType] = useState('Personal Safety');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Contact form modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Family');

  const userName = userProfile?.name || 'Citizen';

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      const [incRes, cntRes, resRes] = await Promise.all([
        incidentsApi.getMyIncidents(),
        contactsApi.getAll(),
        respondersApi.getAll()
      ]);
      setIncidents(incRes.incidents || []);
      setContacts(cntRes.contacts || []);
      setResponders(resRes.responders || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Try to get real location once on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoc({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            address: 'Live Device GPS Telemetry'
          });
        },
        () => {
          // Keep default Bengaluru coordinates
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    // Subscribe to real-time incident updates
    const unsub = socket.on('incident_updated', (data) => {
      setIncidents((prev) =>
        prev.map((item) => (item.id === data.incident.id ? data.incident : item))
      );
    });

    return () => unsub();
  }, [loadData]);

  // One-Tap SOS trigger
  async function triggerSOS() {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      // Determine final coordinates
      let coordinates = { ...loc };
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000
            });
          });
          coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            address: 'Device Verified GPS Coordinates'
          };
          setLoc(coordinates);
        } catch (gpsErr) {
          console.warn('GPS timeout or permission denied, using last known coordinates');
        }
      }

      const res = await incidentsApi.createSOS({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        emergency_type: emergencyType,
        address: coordinates.address || 'Indiranagar, Bengaluru',
        accuracy: coordinates.accuracy || 10
      });

      // Navigate straight to the live incident screen
      nav('/incident/' + res.incident.id);
    } catch (err) {
      console.error('SOS failed:', err);
      setError(err.message || 'Unable to broadcast SOS. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  // Refresh GPS
  function refreshLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          address: 'Device Verified GPS'
        });
        setSuccessMsg('GPS position updated successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      },
      () => {
        setError('Unable to fetch live GPS fix. Using standard coordinates.');
      }
    );
  }

  // Add Contact
  async function handleAddContact(e) {
    e.preventDefault();
    if (!contactName || !contactPhone) return;
    try {
      const res = await contactsApi.add(contactName, contactPhone, contactRelation);
      setContacts((prev) => [...prev, res.contact]);
      setContactName('');
      setContactPhone('');
      setShowContactModal(false);
      setSuccessMsg('Emergency contact added.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to add contact.');
    }
  }

  // Delete Contact
  async function handleDeleteContact(id) {
    try {
      await contactsApi.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError('Failed to delete contact.');
    }
  }

  // Test SMS to Contacts
  async function testContactAlert() {
    try {
      const res = await contactsApi.triggerAlert(incidents[0]?.id || null, loc);
      setSuccessMsg(`Simulated SMS dispatched to ${res.dispatchedCount} emergency contacts.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError('Failed to dispatch alert.');
    }
  }

  const activeInc = incidents.find((i) => ['Pending', 'Accepted', 'En route', 'On scene'].includes(i.status));

  return (
    <Shell title={'Welcome, ' + userName}>
      <div className="top-line">
        <p className="muted">
          Your personal safety command center & emergency beacon.
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

      {/* Active Incident Banner if one is running */}
      {activeInc && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s infinite' }}></span>
              ACTIVE EMERGENCY IN PROGRESS: {activeInc.id}
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '14px' }}>
              Status: <b>{activeInc.status}</b> {activeInc.responder_name ? `· Responder: ${activeInc.responder_name} (${activeInc.responder_type})` : '· Awaiting responder acceptance'}
            </p>
          </div>
          <Button onClick={() => nav('/incident/' + activeInc.id)} style={{ background: '#ef4444', color: '#fff' }}>
            Open Live Incident Tracker →
          </Button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* ONE-TAP SOS CARD */}
        <Card className="sos-card">
          <span className="eyebrow">EMERGENCY ASSISTANCE</span>
          <h2>Need immediate help?</h2>

          <div style={{ margin: '14px 0' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              SELECT EMERGENCY TYPE
            </label>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '13px'
              }}
            >
              <option value="Personal Safety" style={{ background: '#0f172a' }}>Personal Safety / Threat</option>
              <option value="Medical Assist" style={{ background: '#0f172a' }}>Medical Emergency / Ambulance</option>
              <option value="Fire Alert" style={{ background: '#0f172a' }}>Fire & Rescue</option>
              <option value="Crime / Threat" style={{ background: '#0f172a' }}>Police Assistance</option>
              <option value="General Emergency" style={{ background: '#0f172a' }}>General Distress Beacon</option>
            </select>
          </div>

          <button
            className={`sos-button ${activeInc ? 'active' : 'ready'}`}
            disabled={loading}
            onClick={triggerSOS}
            aria-label="Trigger SOS Emergency"
          >
            <span>{loading ? 'SENDING...' : activeInc ? '● LIVE' : 'SOS'}</span>
          </button>

          <p style={{ marginTop: '14px', fontWeight: 600 }}>
            {loading ? 'Broadcasting emergency to response network...' : 'Press and release to broadcast instant alert'}
          </p>

          <small className="muted">
            Transmits your live coordinates to verified responders & trusted contacts.
          </small>
        </Card>

        {/* LOCATION & TRUSTED CONTACTS */}
        <div className="stack">
          <Card title="Current Location">
            <LocationPanel location={loc} />
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <Button variant="outline" onClick={refreshLocation} style={{ fontSize: '12px', padding: '6px 12px' }}>
                <MapPin size={14} style={{ marginRight: '4px' }} />
                Update GPS Fix
              </Button>
            </div>
          </Card>

          <Card
            title="Trusted Contacts"
            actions={
              <button
                className="btn outline"
                onClick={() => setShowContactModal(true)}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                <Plus size={14} /> Add
              </button>
            }
          >
            <div className="list">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div className="list-row" key={contact.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Phone size={17} color="var(--blue, #38bdf8)" />
                      <div>
                        <b>{contact.name}</b>
                        <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                          {contact.phone} · {contact.relationship}
                        </small>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                      title="Delete contact"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ padding: '8px 0' }}>No emergency contacts added yet.</p>
              )}
            </div>

            {contacts.length > 0 && (
              <button
                onClick={testContactAlert}
                className="btn outline"
                style={{ width: '100%', marginTop: '12px', fontSize: '12px', justifyContent: 'center' }}
              >
                <Send size={13} style={{ marginRight: '6px' }} />
                Simulate SMS Broadcast to Contacts
              </button>
            )}
          </Card>
        </div>

        {/* NEARBY RESPONDERS MAP */}
        <Card title="Nearby Responders & Field Units" className="map-card">
          <p className="muted" style={{ fontSize: '12px', margin: '-4px 0 10px' }}>
            Showing verified responders active on the JATAYU network.
          </p>
          <MapPanel
            location={loc}
            responders={responders.filter((r) => r.is_available)}
            zoom={13}
            height="260px"
          />
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span><span style={{ color: '#ef4444' }}>●</span> You</span>
            <span><span style={{ color: '#38bdf8' }}>●</span> Police</span>
            <span><span style={{ color: '#22c55e' }}>●</span> Medical</span>
            <span><span style={{ color: '#f97316' }}>●</span> Fire & Rescue</span>
          </div>
        </Card>

        {/* EMERGENCY HISTORY */}
        <Card title="Emergency History">
          <div className="list">
            {incidents.length > 0 ? (
              incidents.slice(0, 6).map((item) => (
                <Link
                  to={'/incident/' + item.id}
                  className="list-row"
                  key={item.id}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <History size={17} color="var(--blue, #38bdf8)" />
                    <div>
                      <b>{item.id} · {item.emergency_type}</b>
                      <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                        {new Date(item.created_at).toLocaleString()} · {item.address}
                      </small>
                    </div>
                  </div>

                  <Badge
                    type={
                      item.status === 'Resolved'
                        ? 'green'
                        : item.status === 'Cancelled'
                          ? 'gray'
                          : 'red'
                    }
                  >
                    {item.status}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="muted">No emergencies recorded yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* ADD CONTACT MODAL */}
      {showContactModal && (
        <div className="modal-backdrop">
          <div className="card modal">
            <h2>Add Trusted Contact</h2>
            <p className="muted">This contact will receive instant SMS notifications when you press SOS.</p>
            <form onSubmit={handleAddContact}>
              <label>
                Full Name
                <input
                  required
                  placeholder="e.g. Rohan (Brother)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </label>

              <label>
                Phone Number
                <input
                  required
                  placeholder="+91 98860 22233"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </label>

              <label>
                Relationship
                <select
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    marginBottom: '14px'
                  }}
                >
                  <option value="Family" style={{ background: '#0f172a' }}>Family</option>
                  <option value="Friend" style={{ background: '#0f172a' }}>Friend</option>
                  <option value="Colleague" style={{ background: '#0f172a' }}>Colleague</option>
                  <option value="Neighbor" style={{ background: '#0f172a' }}>Neighbor</option>
                  <option value="Doctor" style={{ background: '#0f172a' }}>Doctor / Medical</option>
                </select>
              </label>

              <div className="button-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <Button type="button" variant="outline" onClick={() => setShowContactModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
