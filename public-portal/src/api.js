import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

const client = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const hasAccessToken = () => Boolean(accessToken);

client.interceptors.request.use((request) => {
  if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;
  return request;
});

let recommendationUserIdOverride = null;
export const setRecommendationUserId = (value) => {
  recommendationUserIdOverride = value || null;
};
export function getRecommendationUserId() {
  if (recommendationUserIdOverride) return recommendationUserIdOverride;
  const key = 'government-jobs-recommendation-user';
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

const recommendationHeaders = () => ({ 'X-User-ID': getRecommendationUserId() });

client.interceptors.response.use(
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
        return client(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(
      new Error(
        error.response?.data?.error?.message ||
          (error.code === 'ECONNABORTED' ? 'The request timed out.' : 'The jobs service is unavailable.')
      )
    );
  }
);

/*
  Local preview mode: `VITE_DEMO_DATA=true npm run dev` serves sample records
  from demo.js instead of the API. `import.meta.env.DEV` is false in
  production builds, so this branch and demo.js are removed from the bundle.
*/
const DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO_DATA === 'true';
const demo = async (name, ...args) => (await import('./demo.js')).demoApi[name](...args);

export const getJobs = async (params = {}) =>
  DEMO ? demo('getJobs', params) : (await client.get('/api/jobs', { params })).data;
export const searchJobs = async (params = {}) =>
  DEMO ? demo('searchJobs', params) : (await client.get('/api/search', { params })).data;
export const getLatest = async (limit = 12) =>
  DEMO ? demo('getLatest', limit) : (await client.get('/api/latest', { params: { limit } })).data;
export const getJob = async (id) => (DEMO ? demo('getJob', id) : (await client.get(`/api/jobs/${id}`)).data);
export const getStatistics = async () =>
  DEMO ? demo('getStatistics') : (await client.get('/api/statistics')).data;
export const getRecommendations = async (params = {}) =>
  DEMO
    ? demo('getRecommendations', params)
    : (await client.get('/api/recommendations', { params, headers: recommendationHeaders() })).data;
export const getSimilarJobs = async (jobId, params = {}) =>
  (await client.get(`/api/recommendations/similar/${jobId}`, { params })).data;
export const savePreferences = async (preferences) =>
  (await client.post('/api/preferences', preferences, { headers: recommendationHeaders() })).data;
export const trackInteraction = async (jobId, interaction) =>
  (
    await client.post(
      '/api/recommendations/interactions',
      { job_id: Number(jobId), interaction },
      { headers: recommendationHeaders() }
    )
  ).data;

export const register = async (payload) => (await client.post('/api/auth/register', payload)).data;
export const login = async (payload) => (await client.post('/api/auth/login', payload)).data;
export const refreshSession = async () => (await client.post('/api/auth/refresh')).data;
export const logout = async () => (await client.post('/api/auth/logout')).data;
export const forgotPassword = async (email) =>
  (await client.post('/api/auth/forgot-password', { email })).data;
export const resetPassword = async (access_token, password) =>
  (await client.post('/api/auth/reset-password', { access_token, password })).data;
export const getProfile = async () => (await client.get('/api/profile')).data;
export const updateProfile = async (profile) => (await client.put('/api/profile', profile)).data;
export const recordJobActivity = async (jobId, activity) =>
  (await client.post(`/api/user/jobs/${jobId}/${activity}`)).data;
export const removeSavedJob = async (jobId) =>
  (await client.delete(`/api/user/jobs/${jobId}/saved`)).data;
export const getUserJobs = async (kind, params = {}) =>
  (await client.get(`/api/user/jobs/${kind}`, { params })).data;
