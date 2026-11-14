import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Radio, Users } from 'lucide-react';
import { Logo, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Auth({ register: isRegister = false }) {
  const { login, register, demoLogin } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [responderType, setResponderType] = useState('Police');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loggedUser;
      if (isRegister) {
        loggedUser = await register(name, email, password, role, responderType);
      } else {
        loggedUser = await login(email, password);
      }

      const targetPath = `/${loggedUser.role || 'user'}`;
      nav(targetPath, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoRole) {
    setError('');
    setLoading(true);
    try {
      const loggedUser = await demoLogin(demoRole);
      const targetPath = `/${loggedUser.role || 'user'}`;
      nav(targetPath, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Link className="auth-logo" to="/">
        <Logo />
      </Link>

      <div className="auth-intro">
        <Shield size={70} color="var(--red, #ef4444)" />
        <h1>
          Safety begins<br />
          <em>with connection.</em>
        </h1>
        <p>
          Next-generation personal safety & emergency dispatch platform connecting citizens, responders, and dispatchers in real time.
        </p>

        {/* 1-Click Fast Demo Logins */}
        <div style={{ marginTop: '30px', background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ⚡ Instant 1-Click Demo Logins
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn outline"
              onClick={() => handleDemoLogin('user')}
              disabled={loading}
              style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px' }}
            >
              <User size={16} color="#38bdf8" />
              <span>Login as <b>Citizen (Aarav Sharma)</b></span>
            </button>

            <button
              type="button"
              className="btn outline"
              onClick={() => handleDemoLogin('responder')}
              disabled={loading}
              style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px' }}
            >
              <Radio size={16} color="#22c55e" />
              <span>Login as <b>Responder (Officer Arjun - Police)</b></span>
            </button>

            <button
              type="button"
              className="btn outline"
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px' }}
            >
              <Users size={16} color="#ef4444" />
              <span>Login as <b>Admin (Command Chief Priya)</b></span>
            </button>
          </div>
        </div>
      </div>

      <form className="auth-card card" onSubmit={submit}>
        <span className="eyebrow">JATAYU SECURITY GATEWAY</span>

        <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>

        <p className="muted">
          {isRegister
            ? 'Sign up to activate personal protection or register as a responder'
            : 'Sign in to access your unified safety dashboard'}
        </p>

        {isRegister && (
          <>
            <label>
              Full Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
              />
            </label>

            <label>
              Account Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  marginBottom: '10px'
                }}
              >
                <option value="user" style={{ background: '#0f172a' }}>Citizen / User</option>
                <option value="responder" style={{ background: '#0f172a' }}>Emergency Responder</option>
                <option value="admin" style={{ background: '#0f172a' }}>Dispatcher / Admin</option>
              </select>
            </label>

            {role === 'responder' && (
              <label>
                Responder Branch
                <select
                  value={responderType}
                  onChange={(e) => setResponderType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    marginBottom: '10px'
                  }}
                >
                  <option value="Police" style={{ background: '#0f172a' }}>Police Department</option>
                  <option value="Medical" style={{ background: '#0f172a' }}>Emergency Medical / Paramedic</option>
                  <option value="Fire & Rescue" style={{ background: '#0f172a' }}>Fire & Rescue</option>
                  <option value="Volunteer" style={{ background: '#0f172a' }}>Community Volunteer</option>
                </select>
              </label>
            )}
          </>
        )}

        <label>
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. user@jatayu.org"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </label>

        {error && (
          <p style={{ color: 'var(--red, #ef4444)', fontSize: '13px', margin: '8px 0' }}>{error}</p>
        )}

        <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
          {loading
            ? 'Authenticating...'
            : isRegister
              ? 'Create Account →'
              : 'Sign In →'}
        </Button>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to JATAYU?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>

        <small className="muted" style={{ textAlign: 'center', marginTop: '10px' }}>
          Protected by End-to-End Encryption & Real-time Dispatch Server
        </small>
      </form>
    </div>
  );
}
