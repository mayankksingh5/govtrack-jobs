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

/* Public job data — no account needed. */
export const getJobs = async (params = {}) =>
  DEMO ? demo('getJobs', params) : (await client.get('/api/jobs', { params })).data;
export const searchJobs = async (params = {}) =>
  DEMO ? demo('searchJobs', params) : (await client.get('/api/search', { params })).data;
export const getLatest = async (limit = 12) =>
  DEMO ? demo('getLatest', limit) : (await client.get('/api/latest', { params: { limit } })).data;
export const getJob = async (id) => (DEMO ? demo('getJob', id) : (await client.get(`/api/jobs/${id}`)).data);
export const getStatistics = async () =>
  DEMO ? demo('getStatistics') : (await client.get('/api/statistics')).data;

/* Community Q&A on job pages — public, no account. */
export const getQuestions = async (jobId) =>
  DEMO ? demo('getQuestions', jobId) : (await client.get(`/api/jobs/${jobId}/questions`)).data;
export const askQuestion = async (jobId, question) =>
  DEMO ? demo('askQuestion', jobId, question) : (await client.post(`/api/jobs/${jobId}/questions`, question)).data;

/* Editor sign-in. */
export const login = async (payload) =>
  DEMO ? demo('login') : (await client.post('/api/auth/login', payload)).data;
export const refreshSession = async () =>
  DEMO ? demo('refreshSession') : (await client.post('/api/auth/refresh')).data;
export const logout = async () => (DEMO ? demo('logout') : (await client.post('/api/auth/logout')).data);
export const forgotPassword = async (email) =>
  (await client.post('/api/auth/forgot-password', { email })).data;
export const resetPassword = async (access_token, password) =>
  (await client.post('/api/auth/reset-password', { access_token, password })).data;
export const getProfile = async () => (DEMO ? demo('getProfile') : (await client.get('/api/profile')).data);

/* Admin review (requires an account with the `admin` role). */
export const getAdminSummary = async () =>
  DEMO ? demo('getAdminSummary') : (await client.get('/api/admin/summary')).data;
export const getAdminPosts = async (params = {}) =>
  DEMO ? demo('getAdminPosts', params) : (await client.get('/api/admin/posts', { params })).data;
export const getAdminPost = async (id) =>
  DEMO ? demo('getAdminPost', id) : (await client.get(`/api/admin/posts/${id}`)).data;
export const updateAdminPost = async (id, changes) =>
  DEMO ? demo('updateAdminPost', id, changes) : (await client.put(`/api/admin/posts/${id}`, changes)).data;
export const getAdminQuestions = async (params = {}) =>
  DEMO ? demo('getAdminQuestions', params) : (await client.get('/api/admin/questions', { params })).data;
export const updateAdminQuestion = async (id, changes) =>
  DEMO ? demo('updateAdminQuestion', id, changes) : (await client.put(`/api/admin/questions/${id}`, changes)).data;
export const setAdminPostStatus = async (id, status) =>
  DEMO
    ? demo('updateAdminPost', id, { status })
    : (await client.put(`/api/admin/posts/${id}/status`, { status })).data;
