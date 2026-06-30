import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    const loggedInUser = {
      id: data.id,
      name: data.name,
      email: data.email,
    };
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    setToken(data.token);
    setUser(loggedInUser);
    return data;
  };

  const signup = async (name, email, phoneNumber, password) => {
    const data = await api.auth.signup(name, email, phoneNumber, password);
    const loggedInUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
    };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));

    setToken(data.token);
    setUser(loggedInUser);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateProfileInContext = (name, phoneNumber) => {
    if (user) {
      const updatedUser = { ...user, name, phoneNumber };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    signup,
    logout,
    updateProfileInContext,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
