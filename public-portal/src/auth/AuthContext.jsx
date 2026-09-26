import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, login as apiLogin, logout as apiLogout, refreshSession, setAccessToken } from '../api.js';

const AuthContext = createContext(null);

/*
  Only editors sign in, so the session refresh runs only in a browser where
  an admin has logged in before. Public visitors never call the auth API.
*/
const FLAG = 'govtrack-admin-session';
const storage = {
  has: () => { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } },
  set: () => { try { localStorage.setItem(FLAG, '1'); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(FLAG); } catch { /* storage unavailable */ } },
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: storage.has() });

  const loadProfile = useCallback(async () => {
    const profile = (await getProfile()).data?.[0] || null;
    setState({ user: profile, loading: false });
    return profile;
  }, []);

  useEffect(() => {
    if (!storage.has()) return;
    refreshSession()
      .then((response) => {
        setAccessToken(response.data?.[0]?.access_token);
        return loadProfile();
      })
      .catch(() => {
        storage.clear();
        setAccessToken(null);
        setState({ user: null, loading: false });
      });
  }, [loadProfile]);

  const login = useCallback(async (credentials) => {
    const response = await apiLogin(credentials);
    setAccessToken(response.data?.[0]?.access_token);
    storage.set();
    await loadProfile();
    return response;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try { await apiLogout(); } finally {
      storage.clear();
      setAccessToken(null);
      setState({ user: null, loading: false });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, reloadProfile: loadProfile }),
    [state, login, logout, loadProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
