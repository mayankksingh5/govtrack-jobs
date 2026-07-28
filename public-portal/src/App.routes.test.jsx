import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const api = vi.hoisted(() => ({
  getJobs: vi.fn(),
  searchJobs: vi.fn(),
  getLatest: vi.fn(),
  getStatistics: vi.fn(),
  getJob: vi.fn(),
  getSimilarJobs: vi.fn(),
  trackInteraction: vi.fn(),
  recordJobActivity: vi.fn(),
}));
vi.mock('./api.js', async (original) => ({
  ...(await original()),
  ...api,
  SITE_URL: 'https://portal.test',
}));
vi.mock('./auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: null, loading: false, logout: vi.fn() }),
}));

const response = {
  success: true, total: 1, page: 1, pages: 1,
  data: [{ id: 9, title: 'Test Engineer', organization: 'ISRO', type: 'job', important_links: [] }],
};

function route(path) {
  return render(<HelmetProvider><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></HelmetProvider>);
}

describe('public routes', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset?.());
    api.getJobs.mockResolvedValue(response);
    api.searchJobs.mockResolvedValue(response);
    api.getLatest.mockResolvedValue(response);
    api.getStatistics.mockResolvedValue({ data: [{ published_jobs: 1, by_category: { job: 1 } }] });
    api.getJob.mockResolvedValue(response);
    api.getSimilarJobs.mockResolvedValue({ ...response, data: [] });
    api.trackInteraction.mockResolvedValue({});
    api.recordJobActivity.mockResolvedValue({});
  });

  it('renders jobs and search routes from API data', async () => {
    route('/jobs');
    expect(await screen.findByText('Latest Government Jobs')).toBeInTheDocument();
    expect(await screen.findByText('Test Engineer')).toBeInTheDocument();
  });

  it('renders job details and related empty state', async () => {
    route('/jobs/9');
    expect(await screen.findAllByText('Test Engineer')).not.toHaveLength(0);
    expect(await screen.findByText('Job details')).toBeInTheDocument();
  });

  it('renders a graceful 404 route', async () => {
    route('/does-not-exist');
    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
  });
});
