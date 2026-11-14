import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import User from './pages/User';
import Incident from './pages/Incident';
import Responder from './pages/Responder';
import Admin from './pages/Admin';

import './styles.css';

function Guard({ roles = [], children }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b1120', color: '#fff', fontSize: '18px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
          <span>Connecting to JATAYU Emergency Network...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    return (
      <div className="loading-screen" style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
        Unable to verify session profile. Please <a href="/login" style={{ color: '#38bdf8' }}>re-login</a>.
      </div>
    );
  }

  if (roles.length > 0 && !roles.includes(userProfile.role)) {
    // If user tries to access a page they don't have permission for, redirect to their home
    return <Navigate to={`/${userProfile.role || 'user'}`} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth register />} />

      {/* Citizen Dashboard */}
      <Route
        path="/user"
        element={
          <Guard roles={['user', 'admin']}>
            <User />
          </Guard>
        }
      />

      {/* Incident Tracker - accessible by user, responder, or admin */}
      <Route
        path="/incident"
        element={
          <Guard roles={['user', 'responder', 'admin']}>
            <Incident />
          </Guard>
        }
      />
      <Route
        path="/incident/:id"
        element={
          <Guard roles={['user', 'responder', 'admin']}>
            <Incident />
          </Guard>
        }
      />

      {/* Responder Console */}
      <Route
        path="/responder"
        element={
          <Guard roles={['responder', 'admin']}>
            <Responder />
          </Guard>
        }
      />

      {/* Admin Command Center */}
      <Route
        path="/admin"
        element={
          <Guard roles={['admin']}>
            <Admin />
          </Guard>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
