import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../services/api';
import { socket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('jatayu_token');
    if (!token) {
      setCurrentUser(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res?.user) {
        setCurrentUser(res.user);
        setUserProfile(res.user);
        socket.connect();
      } else {
        localStorage.removeItem('jatayu_token');
        setCurrentUser(null);
        setUserProfile(null);
      }
    } catch (err) {
      console.warn('[Auth Check Error]:', err.message);
      localStorage.removeItem('jatayu_token');
      setCurrentUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('jatayu_token', data.token);
    setCurrentUser(data.user);
    setUserProfile(data.user);
    socket.connect();
    return data.user;
  };

  const register = async (name, email, password, role = 'user', responder_type = 'Police') => {
    const data = await authApi.register(name, email, password, role, responder_type);
    localStorage.setItem('jatayu_token', data.token);
    setCurrentUser(data.user);
    setUserProfile(data.user);
    socket.connect();
    return data.user;
  };

  const demoLogin = async (role = 'user') => {
    const data = await authApi.demoLogin(role);
    localStorage.setItem('jatayu_token', data.token);
    setCurrentUser(data.user);
    setUserProfile(data.user);
    socket.connect();
    return data.user;
  };

  const logout = async () => {
    localStorage.removeItem('jatayu_token');
    setCurrentUser(null);
    setUserProfile(null);
  };

  const value = {
    currentUser,
    userProfile,
    userRole: userProfile?.role || null,
    loading,
    login,
    register,
    demoLogin,
    logout,
    refreshUser: initAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
