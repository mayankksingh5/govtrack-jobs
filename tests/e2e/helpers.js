export const job = {
  id: 101,
  title: 'Civil Engineer Recruitment 2026',
  raw_title: 'Civil Engineer Recruitment 2026',
  organization: 'ISRO',
  source_name: 'ISRO',
  post_name: 'Civil Engineer',
  type: 'job',
  total_vacancy: 25,
  qualification: 'B.Tech',
  age_limit: '18–30 years',
  published_at: '2026-07-29T00:00:00Z',
  last_date: '2026-08-31',
  important_links: [
    { label: 'Official Notification', url: 'https://example.test/notice.pdf' },
    { label: 'Apply Online', url: 'https://example.test/apply' },
  ],
};

export const list = { success: true, total: 1, page: 1, pages: 1, data: [job] };

export async function mockPublicApi(page, { authenticated = false } = {}) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let status = 200;
    let body = list;
    if (path === '/api/auth/refresh') {
      if (authenticated) body = { success: true, data: [{ access_token: 'test-token' }] };
      else {
        status = 401;
        body = { success: false, error: { message: 'No session' } };
      }
    } else if (path === '/api/auth/login') {
      body = { success: true, data: [{ access_token: 'test-token', user: { role: 'user' } }] };
    } else if (path === '/api/auth/register') {
      body = { success: true, data: [{ email_verification_required: true }] };
    } else if (path === '/api/profile') {
      body = { success: true, data: [{ user_id: '00000000-0000-4000-8000-000000000001', name: 'Test User', email: 'user@test.local', role: 'user', skills: [], preferred_states: [], preferred_organizations: [] }] };
    } else if (path === '/api/statistics') {
      body = { success: true, total: 1, page: 1, pages: 1, data: [{ published_jobs: 1, by_category: { job: 1 } }] };
    } else if (path.includes('/similar/')) {
      body = { ...list, data: [] };
    } else if (path === '/api/recommendations') {
      body = { ...list, data: [{ ...job, recommendation_score: 80, recommendation_reasons: [{ factor: 'qualification', points: 25 }] }] };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

export async function mockAdminApi(page, { authenticated = false } = {}) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body = list;
    if (path === '/api/auth/refresh') {
      if (authenticated) body = { success: true, data: [{ access_token: 'admin-token' }] };
      else {
        status = 401;
        body = { success: false, error: { message: 'No session' } };
      }
    } else if (path === '/api/auth/login') {
      body = { success: true, data: [{ access_token: 'admin-token' }] };
    } else if (path === '/api/profile') {
      body = { success: true, data: [{ user_id: '00000000-0000-4000-8000-000000000002', name: 'Admin', email: 'admin@test.local', role: 'admin' }] };
    } else if (path === '/api/statistics') {
      body = { success: true, data: [{ published_jobs: 1, by_category: { job: 1 } }] };
    } else if (path === '/api/recommendations/analytics') {
      body = { success: true, data: [{ most_viewed_jobs: [], most_saved_jobs: [], top_categories: [], top_organizations: [] }] };
    } else if (path === '/health') {
      body = { success: true, data: [{ status: 'ok' }] };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
