import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Radio,
  Users,
  ArrowRight,
  Clock,
  Wifi,
  Activity,
  User,
  CheckCircle2
} from 'lucide-react';
import { Logo } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const features = [
  [Radio, 'One-Tap Emergency SOS', 'Instantly broadcast distress telemetry with real-time GPS coordinates.'],
  [MapPin, 'Live GPS & Route Telemetry', 'Dynamic vector routing and ETA computation between victim and field units.'],
  [Users, 'Automated Contact Escalation', 'Instant SMS gateway simulation notifying trusted contacts with tracking links.'],
  [Shield, 'Verified Responder Fleet', 'Dedicated command console for Police, Paramedics, and Fire & Rescue teams.'],
  [Clock, 'Live Incident Lifecycle', 'Trace every step from SOS trigger, responder acceptance, on scene to resolution.'],
  [Activity, 'Command Center Analytics', 'Tamper-evident cryptographically chained audit trails and dispatcher overrides.']
];

export default function Landing() {
  const { demoLogin } = useAuth();
  const nav = useNavigate();

  const handleDemo = async (role) => {
    try {
      await demoLogin(role);
      nav(`/${role}`);
    } catch (e) {
      console.error('Demo login error:', e);
      nav('/login');
    }
  };

  return (
    <div className="landing">
      {/* TOP NAVIGATION */}
      <nav className="topnav">
        <Logo />
        <div className="navlinks">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how">How it Works</a>
          <a href="#demo">Live Demo</a>
        </div>
        <div className="nav-actions">
          <Link className="btn outline" to="/login">
            Login
          </Link>
          <Link className="btn" to="/register">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero" id="home">
        <span className="eyebrow pill">✦ UNIFIED EMERGENCY RESPONSE NETWORK</span>
        <h1>
          Your Safety.<br />
          <em>Our Priority.</em>
        </h1>
        <p>
          Next-generation personal safety and rapid emergency response platform connecting people in distress with nearby verified responders, trusted contacts, and dispatchers in real time.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
          <Link className="btn large" to="/register">
            Get Protected <ArrowRight size={19} />
          </Link>
          <a className="btn large outline" href="#demo">
            Explore Live Demos
          </a>
        </div>

        <div className="hero-orbit" style={{ marginTop: '40px' }}>
          <div className="orbit-inner" onClick={() => handleDemo('user')} style={{ cursor: 'pointer' }} title="Click to test SOS demo">
            <Shield size={66} color="var(--red, #ef4444)" />
            <strong>SOS</strong>
            <small>ONE TAP TO ACTIVATE</small>
          </div>
        </div>
      </section>

      {/* INSTANT 1-CLICK DEMO ACCOUNTS BAR */}
      <section className="section" id="demo" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 30px' }}>
          <span className="eyebrow">READY TO EVALUATE</span>
          <h2>Explore All 3 Roles in 1-Click</h2>
          <p className="muted">
            The backend is fully operational with persistent SQLite database, WebSockets, and real-time dispatch synchronization.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="card feature" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleDemo('user')}>
            <User size={32} color="#38bdf8" />
            <h3 style={{ margin: '12px 0 6px' }}>Citizen Dashboard</h3>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
              Logged in as Aarav Sharma. Trigger SOS beacons, configure trusted contacts, view nearby responders.
            </p>
            <button className="btn outline" style={{ width: '100%' }}>
              Launch Citizen App →
            </button>
          </div>

          <div className="card feature" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleDemo('responder')}>
            <Radio size={32} color="#22c55e" />
            <h3 style={{ margin: '12px 0 6px' }}>Responder Console</h3>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
              Logged in as Officer Arjun (Police). Accept emergency calls, view live GPS routes, update status to on-scene and resolved.
            </p>
            <button className="btn outline" style={{ width: '100%' }}>
              Launch Responder Console →
            </button>
          </div>

          <div className="card feature" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleDemo('admin')}>
            <Shield size={32} color="#ef4444" />
            <h3 style={{ margin: '12px 0 6px' }}>Command Center</h3>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
              Logged in as Dispatch Chief Priya. Global incident map, manual dispatch overrides, responder verification, and tamper-evident audit ledger.
            </p>
            <button className="btn outline" style={{ width: '100%' }}>
              Launch Command Center →
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <span className="eyebrow">BUILT FOR CRITICAL SECONDS</span>
        <h2>Mission-Critical Features</h2>
        <div className="feature-grid">
          {features.map(([Icon, title, desc]) => (
            <div className="card feature" key={title}>
              <Icon color="var(--blue, #38bdf8)" size={28} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <span className="eyebrow">OPERATIONAL WORKFLOW</span>
        <h2>How JATAYU Coordinates Help</h2>
        <div className="steps">
          {[
            { step: '01', title: 'Citizen Triggers SOS', desc: 'GPS coordinates and emergency profile are captured with high precision.' },
            { step: '02', title: 'Dispatch & Escalation', desc: 'Real-time WebSocket alerts beam to nearby field responders; SMS dispatches to emergency contacts.' },
            { step: '03', title: 'Turn-by-Turn Response', desc: 'Responder accepts, follows live GPS navigation, maintains live chat, and reports on-scene resolution.' }
          ].map((item) => (
            <div className="card" key={item.step}>
              <span className="step-number">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <b>JATAYU Emergency Response Network</b>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
              Full-Stack Autonomous Emergency Platform · Powered by Node.js & React
            </p>
          </div>
          <div style={{ display: 'flex', gap: '14px' }}>
            <Link to="/login" style={{ color: 'var(--muted, #94a3b8)', textDecoration: 'none', fontSize: '13px' }}>Login</Link>
            <Link to="/register" style={{ color: 'var(--muted, #94a3b8)', textDecoration: 'none', fontSize: '13px' }}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
