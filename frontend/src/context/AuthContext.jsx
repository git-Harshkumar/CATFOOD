import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async () => {
    try {
      const storedToken = api.getToken();
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await api.getProfile();
      if (res?.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      api.logout();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const login = async (credentials) => {
    const res = await api.login(credentials);
    if (res?.data?.user) {
      setUser(res.data.user);
      setToken(res.data.token);
      await loadUserProfile();
    }
    return res;
  };

  const register = async (data) => {
    const res = await api.register(data);
    if (res?.data?.user) {
      setUser(res.data.user);
      setToken(res.data.token);
      await loadUserProfile();
    }
    return res;
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile: loadUserProfile,
        isAuthenticated: !!user,
        isOrganizer: user?.role === 'ORGANIZER',
        isJudge: user?.role === 'JUDGE',
        isParticipant: user?.role === 'PARTICIPANT',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
