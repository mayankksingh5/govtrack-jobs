import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
api.interceptors.request.use((request) => {
  if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;
  return request;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !String(original.url).includes('/api/auth/')
    ) {
      original._retried = true;
      try {
        const refreshed = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true, headers: { Accept: 'application/json' } }
        );
        setAccessToken(refreshed.data?.data?.[0]?.access_token);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    const message =
      error.response?.data?.error?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The API request timed out.'
        : 'Unable to reach the API.');
    return Promise.reject(new Error(message));
  }
);

export async function getJobs(params = {}) {
  const { data } = await api.get('/api/jobs', { params });
  return data;
}

export async function searchJobs(params = {}) {
  const { data } = await api.get('/api/search', { params });
  return data;
}

export async function getStatistics() {
  const { data } = await api.get('/api/statistics');
  return data;
}

export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function getRecommendationAnalytics() {
  const { data } = await api.get('/api/recommendations/analytics');
  return data;
}

export async function login(payload) {
  const { data } = await api.post('/api/auth/login', payload);
  return data;
}

export async function refreshSession() {
  const { data } = await api.post('/api/auth/refresh');
  return data;
}

export async function logout() {
  const { data } = await api.post('/api/auth/logout');
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/api/profile');
  return data;
}
