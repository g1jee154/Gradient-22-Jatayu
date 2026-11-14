import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { contactsApi } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [notification, setNotification] = useState(null);

  // Load contacts when user logs in
  useEffect(() => {
    if (currentUser?.id) {
      contactsApi.getAll()
        .then(res => setContacts(res.contacts || []))
        .catch(err => console.warn('Could not load contacts:', err.message));
    } else {
      setContacts([]);
    }
  }, [currentUser?.id]);

  // Listen to WebSocket broadcasts
  useEffect(() => {
    const unsubEmergency = socket.on('new_emergency', (data) => {
      if (currentUser?.role === 'responder' || currentUser?.role === 'admin') {
        setActiveAlert(data.incident);
        setNotification({
          type: 'danger',
          title: `🚨 Emergency Alert: ${data.incident.id}`,
          message: `${data.incident.user_name} needs urgent help (${data.incident.emergency_type}) at ${data.incident.address}`,
          incident: data.incident
        });

        // Optional audio beep
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.2;
          osc.start();
          setTimeout(() => { osc.stop(); ctx.close(); }, 600);
        } catch (e) {}
      }
    });

    const unsubUpdate = socket.on('incident_updated', (data) => {
      setNotification({
        type: 'info',
        title: `Incident ${data.incident.id} Status: ${data.incident.status}`,
        message: data.incident.resolution_notes || `Status changed to ${data.incident.status}`,
        incident: data.incident
      });
    });

    return () => {
      unsubEmergency();
      unsubUpdate();
    };
  }, [currentUser?.role]);

  const clearNotification = () => setNotification(null);

  const value = {
    contacts,
    setContacts,
    activeAlert,
    setActiveAlert,
    notification,
    clearNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return { contacts: [], notification: null };
  }
  return ctx;
};
