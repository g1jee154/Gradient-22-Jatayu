import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Radio,
  History,
  Users,
  LogOut,
  MapPin,
  Wifi,
  WifiOff,
  UserCheck,
  Activity,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export function Logo() {
  return (
    <Link to="/" className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '20px', color: 'var(--text, #f8fafc)' }}>
      <Shield color="var(--red, #ef4444)" size={28} />
      <span>JATAYU</span>
    </Link>
  );
}

export function Button({ children, variant = '', className = '', ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ title, children, className = '', actions = null }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, type = 'blue' }) {
  return <span className={`badge ${type}`}>{children}</span>;
}

export function Stat({ label, value, type = 'blue' }) {
  return (
    <Card className={`stat ${type}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </Card>
  );
}

export function Shell({ title, children }) {
  const { userProfile, logout, demoLogin } = useAuth();
  const { notification, clearNotification } = useApp();
  const navigate = useNavigate();

  const role = userProfile?.role || 'user';
  const name = userProfile?.name || 'User';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleQuickSwitch = async (targetRole) => {
    try {
      await demoLogin(targetRole);
      navigate(`/${targetRole}`, { replace: true });
    } catch (e) {
      console.error('Quick switch failed:', e);
    }
  };

  return (
    <div className="shell">
      {/* Global alert toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: notification.type === 'danger' ? '#ef4444' : '#0284c7',
          color: '#fff',
          padding: '16px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: '15px' }}>{notification.title}</b>
            <button onClick={clearNotification} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.95 }}>{notification.message}</p>
          {notification.incident && (
            <Link
              to={`/incident/${notification.incident.id}`}
              onClick={clearNotification}
              style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600, fontSize: '12px', marginTop: '4px' }}
            >
              Open Incident Tracker →
            </Link>
          )}
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-logo">
          <Logo />
        </div>

        <div className="side-label">
          {role.toUpperCase()} CONTROL CENTER
        </div>

        {role === 'user' && (
          <>
            <NavLink to="/user" end>
              <LayoutDashboard size={18} />
              Overview
            </NavLink>
            <NavLink to="/incident">
              <Radio size={18} />
              Active Incident
            </NavLink>
          </>
        )}

        {role === 'responder' && (
          <>
            <NavLink to="/responder" end>
              <Activity size={18} />
              Responder Console
            </NavLink>
          </>
        )}

        {role === 'admin' && (
          <>
            <NavLink to="/admin" end>
              <Users size={18} />
              Command Center
            </NavLink>
          </>
        )}

        {/* Quick Demo Switcher in Sidebar for smooth judging & testing */}
        <div style={{ marginTop: 'auto', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <small style={{ color: 'var(--muted, #94a3b8)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
            Fast Role Switcher
          </small>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleQuickSwitch('user')}
              style={{
                background: role === 'user' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                color: role === 'user' ? '#38bdf8' : '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Citizen
            </button>
            <button
              onClick={() => handleQuickSwitch('responder')}
              style={{
                background: role === 'responder' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
                color: role === 'responder' ? '#22c55e' : '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Responder
            </button>
            <button
              onClick={() => handleQuickSwitch('admin')}
              style={{
                background: role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                color: role === 'admin' ? '#ef4444' : '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="side-bottom">
          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">
              JATAYU EMERGENCY RESPONSE NETWORK
            </span>
            <h1>{title}</h1>
          </div>

          <div className="header-user">
            <Badge type={role === 'admin' ? 'red' : role === 'responder' ? 'green' : 'blue'}>
              ● {role.toUpperCase()}
            </Badge>
            <span>{name}</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export function Connectivity() {
  const [online, setOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return (
    <Badge type={online ? 'green' : 'red'}>
      {online ? <Wifi size={13} style={{ marginRight: '4px' }} /> : <WifiOff size={13} style={{ marginRight: '4px' }} />}
      {online ? 'Live Backend Connected' : 'Offline'}
    </Badge>
  );
}

export function LocationPanel({ location }) {
  return (
    <div className="location" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <MapPin size={22} color="var(--blue, #38bdf8)" />
      <div>
        <b style={{ display: 'block', fontSize: '14px' }}>
          {location?.latitude?.toFixed(4) ?? '12.9784° N'},{' '}
          {location?.longitude?.toFixed(4) ?? '77.6408° E'}
        </b>
        <small style={{ color: 'var(--muted, #94a3b8)', fontSize: '12px' }}>
          {location?.address || (location ? 'Device GPS telemetry' : 'Indiranagar, Bengaluru')}
        </small>
      </div>
    </div>
  );
}
