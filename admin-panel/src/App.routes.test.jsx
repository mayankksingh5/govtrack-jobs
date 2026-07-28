import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const api = vi.hoisted(() => ({
  getJobs: vi.fn(),
  getStatistics: vi.fn(),
  getRecommendationAnalytics: vi.fn(),
  getHealth: vi.fn(),
}));
vi.mock('./api.js', async (original) => ({ ...(await original()), ...api }));
vi.mock('./components/Charts.jsx', () => ({
  ChartCard: ({ title }) => <div>{title}</div>,
}));
vi.mock('./auth/AuthContext.jsx', () => ({
  useAdminAuth: () => ({ user: { role: 'admin', email: 'admin@test' }, loading: false, logout: vi.fn() }),
}));

describe('admin routes', () => {
  beforeEach(() => {
    api.getJobs.mockResolvedValue({ total: 1, page: 1, pages: 1, data: [{ id: 1, title: 'Engineer', organization: 'ISRO', type: 'job' }] });
    api.getStatistics.mockResolvedValue({ data: [{ published_jobs: 1, by_category: { job: 1 } }] });
    api.getRecommendationAnalytics.mockResolvedValue({ data: [{}] });
    api.getHealth.mockResolvedValue({ data: [{ status: 'ok' }] });
  });
  it('renders the dashboard route', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);
    expect(await screen.findByText('Operations overview')).toBeInTheDocument();
    expect(await screen.findByText('Total Jobs')).toBeInTheDocument();
  });
  it('renders jobs and settings routes', async () => {
    const first = render(<MemoryRouter initialEntries={['/jobs']}><App /></MemoryRouter>);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    first.unmount();
    render(<MemoryRouter initialEntries={['/settings']}><App /></MemoryRouter>);
    expect(await screen.findByText('Healthy')).toBeInTheDocument();
  });
});
