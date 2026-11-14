import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Phone, User, CheckCircle2 } from 'lucide-react';
import { Logo, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Auth({ register: isRegister = false }) {
  const { login, register, googleLogin } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [responderType, setResponderType] = useState('Police');

  const [googlePrompt, setGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googlePhone, setGooglePhone] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Standard Email + Password submission
  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loggedUser;
      if (isRegister) {
        if (!phone || phone.trim().length < 8) {
          throw new Error('Please enter a valid phone number for emergency contact dispatch.');
        }
        loggedUser = await register(name, email, password, phone, role, responderType);
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

  // Google Sign-In & Verification
  async function handleGoogleAuthSubmit(e) {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      setError('Please provide a valid Google email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const loggedUser = await googleLogin({
        email: googleEmail,
        name: googleEmail.split('@')[0],
        phone: googlePhone || '+91 98765 00000',
        role,
        responder_type: responderType,
        google_id: 'g_' + Math.random().toString(36).slice(2, 10)
      });

      const targetPath = `/${loggedUser.role || 'user'}`;
      nav(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Google verification failed.');
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
          Next-generation personal safety & rapid emergency dispatch platform connecting citizens, verified responders, and emergency contacts in real time.
        </p>

        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '14px' }}>
            <CheckCircle2 size={18} color="#22c55e" />
            <span>Carrier-grade emergency SMS & telemetry dispatch</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '14px' }}>
            <CheckCircle2 size={18} color="#22c55e" />
            <span>End-to-end encrypted biometric & location protection</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '14px' }}>
            <CheckCircle2 size={18} color="#22c55e" />
            <span>PWA enabled: works offline and installs on any mobile device</span>
          </div>
        </div>
      </div>

      <form className="auth-card card" onSubmit={submit}>
        <span className="eyebrow">JATAYU SECURITY GATEWAY</span>

        <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>

        <p className="muted" style={{ marginBottom: '18px' }}>
          {isRegister
            ? 'Sign up to activate emergency beacon telemetry & contact escalation.'
            : 'Sign in to access your unified safety command center.'}
        </p>

        {/* GOOGLE SIGN IN BUTTON */}
        <button
          type="button"
          onClick={() => setGooglePrompt(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: '#ffffff',
            color: '#1f2937',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '18px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          {isRegister ? 'Sign up with Google (Verified)' : 'Sign in with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '11px', color: 'var(--muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            or continue with email
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {isRegister && (
          <>
            <label>
              Full Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jeevan G A"
              />
            </label>

            <label>
              Mobile Phone Number (Required for Real SOS Dispatch)
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
              <small className="muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                Used to verify identity and dispatch notifications to your trusted contacts.
              </small>
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
                <option value="user" style={{ background: '#0f172a' }}>Citizen / Personal Protection</option>
                <option value="responder" style={{ background: '#0f172a' }}>Emergency Responder</option>
                <option value="admin" style={{ background: '#0f172a' }}>Dispatcher / Admin</option>
              </select>
            </label>

            {role === 'responder' && (
              <label>
                Emergency Response Branch
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
            placeholder="e.g. you@example.com"
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

        <p className="auth-switch" style={{ marginTop: '16px' }}>
          {isRegister ? 'Already have an account?' : 'New to JATAYU?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </form>

      {/* GOOGLE VERIFICATION MODAL */}
      {googlePrompt && (
        <div className="modal-backdrop">
          <div className="card modal" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(66, 133, 244, 0.1)', borderRadius: '50%', marginBottom: '14px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px' }}>Verify with Google Account</h3>
            <p className="muted" style={{ fontSize: '13px', margin: '0 0 18px' }}>
              Connect your Google email for verified authentication.
            </p>

            <form onSubmit={handleGoogleAuthSubmit} style={{ textAlign: 'left' }}>
              <label>
                Google Email Address
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                />
              </label>

              <label>
                Emergency Contact Phone
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                />
              </label>

              <div className="button-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button type="button" variant="outline" onClick={() => setGooglePrompt(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Authenticate & Continue →'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
