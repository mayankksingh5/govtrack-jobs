import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute } from './middleware.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMIT', message: 'Too many authentication attempts. Try again later.' },
  },
});

router.use(authLimiter);

function authClient() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new ApiError(500, 'AUTH_CONFIGURATION_ERROR', 'Authentication is not configured');
  }
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function email(value) {
  const parsed = String(value || '').trim().toLowerCase();
  if (!emailPattern.test(parsed) || parsed.length > 254) {
    throw new ApiError(400, 'INVALID_EMAIL', 'A valid email address is required');
  }
  return parsed;
}

function password(value) {
  const parsed = String(value || '');
  if (parsed.length < 10 || parsed.length > 128) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Password must be between 10 and 128 characters');
  }
  if (!/[a-z]/.test(parsed) || !/[A-Z]/.test(parsed) || !/\d/.test(parsed)) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Password must include upper-case, lower-case, and numeric characters');
  }
  return parsed;
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60_000,
  };
}

function setSession(res, session) {
  if (session?.refresh_token) res.cookie('refresh_token', session.refresh_token, refreshCookieOptions());
  return {
    access_token: session?.access_token || null,
    expires_in: session?.expires_in || null,
    token_type: 'bearer',
  };
}

function clearRefreshCookie(res) {
  const options = refreshCookieOptions();
  delete options.maxAge;
  res.clearCookie('refresh_token', options);
}

router.post(
  '/register',
  asyncRoute(async (req, res) => {
    const userEmail = email(req.body.email);
    const userPassword = password(req.body.password);
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 100) {
      throw new ApiError(400, 'INVALID_NAME', 'Name must be between 2 and 100 characters');
    }
    const { data, error } = await authClient().auth.signUp({
      email: userEmail,
      password: userPassword,
      options: {
        data: { name },
        emailRedirectTo: config.emailVerificationRedirectUrl,
      },
    });
    if (error) throw new ApiError(400, 'REGISTRATION_FAILED', error.message);
    const tokens = setSession(res, data.session);
    res.status(201).json({
      success: true,
      data: [{
        user: { id: data.user?.id, email: data.user?.email, name },
        ...tokens,
        email_verification_required: !data.session,
      }],
    });
  })
);

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const { data, error } = await authClient().auth.signInWithPassword({
      email: email(req.body.email),
      password: String(req.body.password || ''),
    });
    if (error || !data.session) throw new ApiError(401, 'LOGIN_FAILED', 'Invalid email, password, or unverified account');
    const profile = await getRecommendationDb()
      .from('user_profiles')
      .select('name, role, avatar_url')
      .eq('user_id', data.user.id)
      .maybeSingle();
    res.json({
      success: true,
      data: [{
        user: {
          id: data.user.id,
          email: data.user.email,
          name: profile.data?.name,
          role: profile.data?.role || 'user',
          avatar_url: profile.data?.avatar_url,
        },
        ...setSession(res, data.session),
      }],
    });
  })
);

router.post(
  '/refresh',
  asyncRoute(async (req, res) => {
    const token = req.cookies.refresh_token;
    if (!token) throw new ApiError(401, 'REFRESH_REQUIRED', 'Refresh token cookie is missing');
    const { data, error } = await authClient().auth.refreshSession({ refresh_token: token });
    if (error || !data.session) {
      clearRefreshCookie(res);
      throw new ApiError(401, 'REFRESH_FAILED', 'Refresh token is invalid or expired');
    }
    res.json({ success: true, data: [{ ...setSession(res, data.session) }] });
  })
);

router.post(
  '/logout',
  asyncRoute(async (req, res) => {
    const authorization = req.get('authorization') || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
    if (accessToken) await getRecommendationDb().auth.admin.signOut(accessToken, 'local');
    clearRefreshCookie(res);
    res.json({ success: true, data: [{ logged_out: true }] });
  })
);

router.post(
  '/forgot-password',
  asyncRoute(async (req, res) => {
    await authClient().auth.resetPasswordForEmail(email(req.body.email), {
      redirectTo: config.passwordResetRedirectUrl,
    });
    res.json({
      success: true,
      data: [{ message: 'If the account exists, a password reset email has been sent.' }],
    });
  })
);

router.post(
  '/reset-password',
  asyncRoute(async (req, res) => {
    const accessToken = String(req.body.access_token || '').trim();
    if (!accessToken) throw new ApiError(400, 'RECOVERY_TOKEN_REQUIRED', 'Recovery access token is required');
    const db = getRecommendationDb();
    const { data, error } = await db.auth.getUser(accessToken);
    if (error || !data.user) throw new ApiError(401, 'INVALID_RECOVERY_TOKEN', 'Recovery token is invalid or expired');
    const update = await db.auth.admin.updateUserById(data.user.id, { password: password(req.body.password) });
    if (update.error) throw new ApiError(400, 'PASSWORD_RESET_FAILED', update.error.message);
    res.json({ success: true, data: [{ password_reset: true }] });
  })
);

export default router;
