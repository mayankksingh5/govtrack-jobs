import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  register as apiRegister,
  setAccessToken,
  setRecommendationUserId,
} from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  const loadProfile = useCallback(async () => {
    const profile = (await getProfile()).data?.[0] || null;
    setRecommendationUserId(profile?.user_id);
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
        setRecommendationUserId(null);
        setState({ user: null, loading: false });
      });
  }, [loadProfile]);

  const login = useCallback(async (credentials) => {
    const response = await apiLogin(credentials);
    setAccessToken(response.data?.[0]?.access_token);
    await loadProfile();
    return response;
  }, [loadProfile]);

  const register = useCallback(async (details) => {
    const response = await apiRegister(details);
    if (response.data?.[0]?.access_token) {
      setAccessToken(response.data[0].access_token);
      await loadProfile();
    }
    return response;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try { await apiLogout(); } finally {
      setAccessToken(null);
      setRecommendationUserId(null);
      setState({ user: null, loading: false });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, reloadProfile: loadProfile }),
    [state, login, register, logout, loadProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
