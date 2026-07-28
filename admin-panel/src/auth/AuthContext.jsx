import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  setAccessToken,
} from '../api.js';

const Context = createContext(null);

export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });
  const loadProfile = useCallback(async () => {
    const profile = (await getProfile()).data?.[0] || null;
    setState({ user: profile, loading: false });
    return profile;
  }, []);
  useEffect(() => {
    refreshSession()
      .then((response) => {
        setAccessToken(response.data?.[0]?.access_token);
        return loadProfile();
      })
      .catch(() => {
        setAccessToken(null);
        setState({ user: null, loading: false });
      });
  }, [loadProfile]);
  const login = useCallback(async (credentials) => {
    const response = await apiLogin(credentials);
    setAccessToken(response.data?.[0]?.access_token);
    return loadProfile();
  }, [loadProfile]);
  const logout = useCallback(async () => {
    try { await apiLogout(); } finally {
      setAccessToken(null);
      setState({ user: null, loading: false });
    }
  }, []);
  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useAdminAuth = () => useContext(Context);
