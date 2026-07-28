const required = ['BACKEND_URL', 'PUBLIC_URL', 'ADMIN_URL'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing verification variables: ${missing.join(', ')}`);
  process.exit(1);
}

const urls = Object.fromEntries(
  required.map((name) => {
    const value = process.env[name].replace(/\/$/, '');
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS`);
    return [name, value];
  })
);

async function check(name, action) {
  try {
    await action();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

async function response(url, options, expectedStatus = 200) {
  const result = await fetch(url, { redirect: 'follow', ...options });
  if (result.status !== expectedStatus) {
    throw new Error(`expected HTTP ${expectedStatus}, received ${result.status}`);
  }
  return result;
}

await check('backend health endpoint', async () => {
  const result = await response(`${urls.BACKEND_URL}/health`);
  const body = await result.json();
  if (!body.success || body.data?.[0]?.status !== 'ok') {
    throw new Error('health response is not healthy');
  }
});

await check('public portal reachable', async () => {
  const result = await response(urls.PUBLIC_URL);
  if (!(await result.text()).includes('id="root"')) throw new Error('unexpected portal HTML');
});

await check('admin panel reachable', async () => {
  const result = await response(urls.ADMIN_URL);
  if (!(await result.text()).includes('id="root"')) throw new Error('unexpected admin HTML');
});

for (const [name, origin] of [
  ['public portal CORS', urls.PUBLIC_URL],
  ['admin panel CORS', urls.ADMIN_URL],
]) {
  await check(name, async () => {
    const result = await response(`${urls.BACKEND_URL}/api/auth/refresh`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    }, 204);
    if (result.headers.get('access-control-allow-origin') !== origin) {
      throw new Error('origin was not allowed');
    }
    if (result.headers.get('access-control-allow-credentials') !== 'true') {
      throw new Error('credentialed requests were not enabled');
    }
  });
}

await check('authentication middleware', async () => {
  const result = await response(`${urls.BACKEND_URL}/api/profile`, {}, 401);
  const body = await result.json();
  if (body.error?.code !== 'AUTHENTICATION_REQUIRED') {
    throw new Error('protected endpoint returned an unexpected response');
  }
});

await check('recommendations endpoint', async () => {
  const result = await response(`${urls.BACKEND_URL}/api/recommendations?limit=1`, {
    headers: { 'X-User-ID': crypto.randomUUID() },
  });
  const body = await result.json();
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error('recommendations response is invalid');
  }
});

if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
  await check('login, profile, and admin authorization', async () => {
    const loginResult = await response(`${urls.BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: urls.ADMIN_URL },
      body: JSON.stringify({
        email: process.env.TEST_EMAIL,
        password: process.env.TEST_PASSWORD,
      }),
    });
    const loginBody = await loginResult.json();
    const token = loginBody.data?.[0]?.access_token;
    if (!token) throw new Error('login did not return an access token');

    const profileResult = await response(`${urls.BACKEND_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}`, Origin: urls.ADMIN_URL },
    });
    const profile = await profileResult.json();
    if (!profile.success) throw new Error('profile request failed');

    const analyticsResult = await response(
      `${urls.BACKEND_URL}/api/recommendations/analytics`,
      { headers: { Authorization: `Bearer ${token}`, Origin: urls.ADMIN_URL } },
      loginBody.data?.[0]?.user?.role === 'admin' ? 200 : 403
    );
    await analyticsResult.body?.cancel();
  });
} else {
  console.log('SKIP credentialed login/admin check (set TEST_EMAIL and TEST_PASSWORD)');
}

if (process.exitCode) process.exit(process.exitCode);
