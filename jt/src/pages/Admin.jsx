import React, { useState, useEffect, useCallback } from 'react';
import {
  Shell,
  Card,
  Stat,
  Badge,
  Button,
  Connectivity
} from '../components/UI';
import MapPanel from '../components/MapPanel';
import { adminApi, incidentsApi, respondersApi } from '../services/api';
import { socket } from '../services/socket';
import { Shield, Users, Radio, CheckCircle, AlertTriangle, FileText, Lock, Database, Edit, Trash2, RefreshCw } from 'lucide-react';

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState({
    totalUsers: 12480,
    totalResponders: 4,
    availableResponders: 3,
    activeEmergencies: 1,
    resolvedIncidents: 1840,
    avgResponseTimeMinutes: 4.8
  });
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Dispatch modal state
  const [dispatchModal, setDispatchModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedResponderId, setSelectedResponderId] = useState('');

  // Database Explorer state
  const [dbTables, setDbTables] = useState([]);
  const [currentDbTable, setCurrentDbTable] = useState('users');
  const [tableRows, setTableRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [editRowData, setEditRowData] = useState(null);
  const [editModal, setEditModal] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAllData = useCallback(async () => {
    try {
      const [statsRes, incRes, respRes, usersRes, logsRes] = await Promise.all([
        adminApi.getStats(),
        incidentsApi.getAll(),
        respondersApi.getAll(),
        adminApi.getUsers(),
        adminApi.getAuditLogs()
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      setIncidents(incRes.incidents || []);
      setResponders(respRes.responders || []);
      setUsers(usersRes.users || []);
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  }, []);

  const loadDbTable = useCallback(async (tableName) => {
    try {
      setTableLoading(true);
      setCurrentDbTable(tableName);
      const res = await adminApi.getTableRows(tableName);
      setTableRows(res.rows || []);
    } catch (err) {
      console.error('Error querying table:', err);
      setError('Failed to load table ' + tableName);
    } finally {
      setTableLoading(false);
    }
  }, []);

  const loadDbTablesList = useCallback(async () => {
    try {
      const res = await adminApi.getDbTables();
      setDbTables(res.tables || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadAllData();
    loadDbTablesList();

    // Listen to real-time events
    const unsubNew = socket.on('new_emergency', (data) => {
      setIncidents((prev) => [data.incident, ...prev.filter((i) => i.id !== data.incident.id)]);
      setStats((prev) => ({ ...prev, activeEmergencies: prev.activeEmergencies + 1 }));
      setMessage(`🚨 New incoming SOS alert: ${data.incident.id}`);
      setTimeout(() => setMessage(''), 5000);
    });

    const unsubUpdate = socket.on('incident_updated', (data) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === data.incident.id ? data.incident : i))
      );
    });

    const unsubResp = socket.on('responder_updated', (data) => {
      setResponders((prev) =>
        prev.map((r) => (r.id === data.responder.id ? data.responder : r))
      );
    });

    return () => {
      unsubNew();
      unsubUpdate();
      unsubResp();
    };
  }, [loadAllData, loadDbTablesList]);

  // When switching to Database Explorer tab, load tables
  useEffect(() => {
    if (tab === 'Database Explorer') {
      loadDbTablesList();
      loadDbTable(currentDbTable);
    }
  }, [tab, currentDbTable, loadDbTable, loadDbTablesList]);

  // Handle Verify / Reject Responder
  async function handleVerifyResponder(id, verifyStatus) {
    try {
      const res = await respondersApi.verify(id, verifyStatus);
      setResponders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_verified: verifyStatus ? 1 : 0 } : r))
      );
      setMessage(res.message);
      setTimeout(() => setMessage(''), 3000);
      adminApi.getAuditLogs().then((l) => setAuditLogs(l.logs || []));
    } catch (err) {
      setError(err.message || 'Failed to update responder verification.');
    }
  }

  // Handle Suspend / Reinstate User
  async function handleToggleUserStatus(id, currentStatus) {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const res = await adminApi.updateUserStatus(id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, account_status: newStatus } : u))
      );
      setMessage(res.message);
      setTimeout(() => setMessage(''), 3000);
      adminApi.getAuditLogs().then((l) => setAuditLogs(l.logs || []));
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  }

  // Handle Manual Dispatch
  async function handleDispatchSubmit(e) {
    e.preventDefault();
    if (!selectedIncident || !selectedResponderId) return;

    try {
      const res = await incidentsApi.dispatch(selectedIncident.id, selectedResponderId);
      setIncidents((prev) =>
        prev.map((i) => (i.id === res.incident.id ? res.incident : i))
      );
      setDispatchModal(false);
      setSelectedIncident(null);
      setSelectedResponderId('');
      setMessage(`Responder successfully dispatched to ${res.incident.id}`);
      setTimeout(() => setMessage(''), 4000);
      adminApi.getAuditLogs().then((l) => setAuditLogs(l.logs || []));
    } catch (err) {
      setError(err.message || 'Failed to dispatch responder.');
    }
  }

  // Handle Save Row in Database Explorer
  async function handleSaveRowEdit(e) {
    e.preventDefault();
    if (!editRowData) return;
    try {
      for (const [col, val] of Object.entries(editRowData)) {
        if (col !== 'id') {
          await adminApi.updateTableCell(currentDbTable, editRowData.id, col, val);
        }
      }
      setMessage(`Record in '${currentDbTable}' updated successfully.`);
      setTimeout(() => setMessage(''), 3000);
      setEditModal(false);
      loadDbTable(currentDbTable);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to update record.');
    }
  }

  // Handle Delete Row in Database Explorer
  async function handleDeleteDbRow(id) {
    if (!window.confirm(`Are you sure you want to delete row ${id} from table ${currentDbTable}?`)) return;
    try {
      await adminApi.deleteTableRow(currentDbTable, id);
      setTableRows((prev) => prev.filter((r) => r.id !== id));
      setMessage(`Row ${id} deleted from ${currentDbTable}.`);
      setTimeout(() => setMessage(''), 3000);
      loadDbTablesList();
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to delete row.');
    }
  }

  const activeIncidents = incidents.filter((i) =>
    ['Pending', 'Accepted', 'En route', 'On scene'].includes(i.status)
  );

  const filteredIncidents = incidents.filter((i) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['Pending', 'Accepted', 'En route', 'On scene'].includes(i.status);
    return i.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <Shell title="Command Center Administration">
      <div className="top-line">
        <p className="muted">
          Unified City-Wide Emergency Telemetry, Dispatch & Database Management
        </p>
        <Connectivity />
      </div>

      {message && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#22c55e', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="stats-grid four" style={{ marginBottom: '20px' }}>
        <Stat label="Platform Users" value={stats.totalUsers.toLocaleString()} type="blue" />
        <Stat label="Active Emergencies" value={activeIncidents.length} type={activeIncidents.length > 0 ? 'red' : 'blue'} />
        <Stat label="Available Responders" value={responders.filter((r) => r.is_available && r.is_verified).length} type="green" />
        <Stat label="Resolved Incidents" value={stats.resolvedIncidents.toLocaleString()} type="blue" />
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        {['Overview', 'Incident Dispatch Feed', 'Responder Fleet', 'User Directory', 'Database Explorer', 'Tamper-Evident Audit Ledger'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: tab === t ? '#38bdf8' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t === 'Database Explorer' && <Database size={14} />}
            {t}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'Overview' && (
        <>
          <div className="two-col" style={{ marginBottom: '20px' }}>
            <Card title="City-Wide Live Telemetry Map">
              <p className="muted" style={{ fontSize: '12px', margin: '-4px 0 10px' }}>
                Displaying real-time emergency locations & deployed response units.
              </p>
              <MapPanel
                location={{ latitude: 12.9784, longitude: 77.6408 }}
                incidents={activeIncidents}
                responders={responders.filter((r) => r.is_available)}
                zoom={12}
                height="320px"
              />
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
                <span><span style={{ color: '#ef4444' }}>●</span> Active Distress Signal</span>
                <span><span style={{ color: '#38bdf8' }}>●</span> Police Unit</span>
                <span><span style={{ color: '#22c55e' }}>●</span> Paramedic</span>
                <span><span style={{ color: '#f97316' }}>●</span> Fire & Rescue</span>
              </div>
            </Card>

            <Card title="Active Emergencies Feed">
              <div className="list">
                {activeIncidents.length > 0 ? (
                  activeIncidents.map((i) => (
                    <div key={i.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b>{i.id} · {i.emergency_type}</b>
                        <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                          Victim: {i.user_name} · {i.address}
                        </small>
                        <small style={{ color: i.responder_name ? '#38bdf8' : '#f97316', fontWeight: 600 }}>
                          {i.responder_name ? `Assigned: ${i.responder_name} (${i.responder_type})` : 'Awaiting dispatch'}
                        </small>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Badge type={i.status === 'Pending' ? 'red' : 'blue'}>{i.status}</Badge>
                        <button
                          className="btn outline"
                          onClick={() => { setSelectedIncident(i); setDispatchModal(true); }}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>
                    All sectors clear. No active emergencies currently open.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Card title="System Performance & Response Times">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '10px 0' }}>
              <div>
                <small className="muted">Average Response Time</small>
                <h3 style={{ margin: '4px 0', color: '#22c55e' }}>4.8 mins</h3>
                <small style={{ color: '#94a3b8' }}>Target: &lt; 8 mins</small>
              </div>
              <div>
                <small className="muted">Dispatch Success Rate</small>
                <h3 style={{ margin: '4px 0', color: '#38bdf8' }}>99.2%</h3>
                <small style={{ color: '#94a3b8' }}>Automated matching active</small>
              </div>
              <div>
                <small className="muted">Verified Responder Fleet</small>
                <h3 style={{ margin: '4px 0', color: '#f97316' }}>{responders.filter((r) => r.is_verified).length} units</h3>
                <small style={{ color: '#94a3b8' }}>All background-checked</small>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* TAB 2: INCIDENT DISPATCH FEED */}
      {tab === 'Incident Dispatch Feed' && (
        <Card
          title="Master Incidents Directory"
          actions={
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'active', 'Pending', 'Resolved', 'Cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    background: statusFilter === f ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: statusFilter === f ? '#38bdf8' : '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          }
        >
          <div className="list">
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((i) => (
                <div key={i.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b>{i.id} · {i.emergency_type}</b>
                    <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                      Victim: {i.user_name} ({i.user_phone || 'No phone'}) · {i.address} · {new Date(i.created_at).toLocaleString()}
                    </small>
                    <small style={{ color: '#38bdf8' }}>
                      {i.responder_name ? `Assigned Unit: ${i.responder_name} (${i.responder_type})` : 'Unassigned'}
                      {i.resolution_notes ? ` · Note: ${i.resolution_notes}` : ''}
                      {i.cancel_reason ? ` · Reason: ${i.cancel_reason}` : ''}
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge type={i.status === 'Resolved' ? 'green' : i.status === 'Cancelled' ? 'gray' : 'red'}>
                      {i.status}
                    </Badge>
                    {!['Resolved', 'Cancelled'].includes(i.status) && (
                      <button
                        className="btn outline"
                        onClick={() => { setSelectedIncident(i); setDispatchModal(true); }}
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        Override Dispatch
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No incidents matching filter.</p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: RESPONDER FLEET */}
      {tab === 'Responder Fleet' && (
        <Card title="Responder Fleet & Verification Management">
          <div className="list">
            {responders.map((r) => (
              <div key={r.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>{r.name} · {r.responder_type}</b>
                  <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                    Badge: {r.badge_number} · Email: {r.email} · Phone: {r.phone || 'N/A'}
                  </small>
                  <small style={{ color: r.is_available ? '#22c55e' : '#94a3b8' }}>
                    Status: {r.is_available ? '● Available / On Duty' : '○ Standby / Offline'}
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge type={r.is_verified ? 'green' : 'amber'}>
                    {r.is_verified ? 'Verified Unit' : 'Pending Verification'}
                  </Badge>
                  {r.is_verified ? (
                    <button
                      className="btn outline"
                      onClick={() => handleVerifyResponder(r.id, false)}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={() => handleVerifyResponder(r.id, true)}
                      style={{ fontSize: '12px', padding: '4px 10px', background: '#22c55e', color: '#fff' }}
                    >
                      Approve Unit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: USER DIRECTORY */}
      {tab === 'User Directory' && (
        <Card title="Registered Citizens & Accounts">
          <div className="list">
            {users.map((u) => (
              <div key={u.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>{u.name}</b>
                  <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                    {u.email} · Role: {u.role.toUpperCase()} {u.phone ? `· Phone: ${u.phone}` : ''} {u.blood_group ? `· Blood: ${u.blood_group}` : ''}
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge type={u.account_status === 'active' ? 'green' : 'gray'}>
                    {u.account_status.toUpperCase()}
                  </Badge>
                  {u.role !== 'admin' && (
                    <button
                      className="btn outline"
                      onClick={() => handleToggleUserStatus(u.id, u.account_status)}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      {u.account_status === 'active' ? 'Suspend' : 'Reinstate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 5: DATABASE EXPLORER (FIREBASE-LIKE GUI VIEWER & EDITOR) */}
      {tab === 'Database Explorer' && (
        <Card
          title={`Database Explorer · Table: ${currentDbTable} (${tableRows.length} rows)`}
          actions={
            <Button
              variant="outline"
              onClick={() => loadDbTable(currentDbTable)}
              style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} /> Refresh
            </Button>
          }
        >
          <p className="muted" style={{ fontSize: '13px', margin: '-4px 0 16px' }}>
            Interactive Firebase-like database console. Click on any table to view rows, edit records, or delete test entries in real time.
          </p>

          {/* Table Selector Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {dbTables.map((t) => (
              <button
                key={t.table}
                onClick={() => loadDbTable(t.table)}
                style={{
                  background: currentDbTable === t.table ? 'var(--blue, #38bdf8)' : 'rgba(255,255,255,0.06)',
                  color: currentDbTable === t.table ? '#080e1b' : '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{t.table}</span>
                <span style={{ fontSize: '10px', opacity: 0.8, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table Data Grid */}
          {tableLoading ? (
            <p className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>Querying database...</p>
          ) : tableRows.length === 0 ? (
            <p className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>Table is empty.</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '450px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Actions</th>
                    {Object.keys(tableRows[0] || {}).map((col) => (
                      <th key={col} style={{ padding: '10px 12px', color: '#38bdf8', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            title="Edit row"
                            onClick={() => { setEditRowData({ ...row }); setEditModal(true); }}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            title="Delete row"
                            onClick={() => handleDeleteDbRow(row.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {Object.entries(row).map(([k, v]) => (
                        <td
                          key={k}
                          style={{
                            padding: '8px 12px',
                            maxWidth: '250px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={String(v ?? '')}
                        >
                          {k.includes('password') ? '••••••••' : String(v ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {tab === 'Tamper-Evident Audit Ledger' && (
        <Card title="Tamper-Evident Cryptographic Audit Trail">
          <p className="muted" style={{ fontSize: '13px', margin: '-4px 0 14px' }}>
            <Lock size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Each entry is chained with a forward-secure cryptographic digest verifying platform integrity.
          </p>

          <div className="list">
            {auditLogs.map((log) => (
              <div key={log.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <b>{log.action}</b>
                  <small style={{ display: 'block', color: 'var(--muted, #94a3b8)' }}>
                    Actor: {log.actor} · {new Date(log.created_at).toLocaleString()}
                  </small>
                  {log.details && (
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#cbd5e1' }}>
                      {log.details}
                    </p>
                  )}
                </div>

                <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '4px', color: '#38bdf8' }}>
                  #{log.hash}
                </code>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EDIT ROW MODAL IN DATABASE EXPLORER */}
      {editModal && editRowData && (
        <div className="modal-backdrop">
          <div className="card modal" style={{ maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2>Edit Record in '{currentDbTable}'</h2>
            <p className="muted">Primary ID: <b>{editRowData.id}</b></p>

            <form onSubmit={handleSaveRowEdit}>
              {Object.keys(editRowData).map((col) => {
                if (col === 'id') return null;
                const isPassword = col.includes('password');
                return (
                  <label key={col} style={{ display: 'block', margin: '10px 0', fontSize: '12px' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{col}</span>:
                    <input
                      type={isPassword ? 'password' : 'text'}
                      value={editRowData[col] ?? ''}
                      onChange={(e) => setEditRowData({ ...editRowData, [col]: e.target.value })}
                      style={{ marginTop: '4px', padding: '8px', fontSize: '13px' }}
                    />
                  </label>
                );
              })}

              <div className="button-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL DISPATCH MODAL */}
      {dispatchModal && selectedIncident && (
        <div className="modal-backdrop">
          <div className="card modal">
            <h2>Dispatch Responder to {selectedIncident.id}</h2>
            <p className="muted">
              Emergency: {selectedIncident.emergency_type} at {selectedIncident.address}
            </p>

            <form onSubmit={handleDispatchSubmit}>
              <label>
                Select Response Unit:
                <select
                  required
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    margin: '8px 0 16px'
                  }}
                >
                  <option value="" style={{ background: '#0f172a' }}>-- Select an available responder --</option>
                  {responders.map((r) => (
                    <option key={r.id} value={r.id} style={{ background: '#0f172a' }}>
                      {r.name} ({r.responder_type} - {r.badge_number}) {r.is_available ? '• Available' : '• Standby'}
                    </option>
                  ))}
                </select>
              </label>

              <div className="button-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="outline" onClick={() => setDispatchModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!selectedResponderId}>
                  Confirm Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
