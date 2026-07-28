const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const origins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: positiveInt(process.env.PORT, 3000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  corsOrigins: origins,
  rateLimitWindowMs: positiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: positiveInt(process.env.RATE_LIMIT_MAX, 100),
  authRateLimitMax: positiveInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  passwordResetRedirectUrl:
    process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:5174/reset-password',
  emailVerificationRedirectUrl:
    process.env.EMAIL_VERIFICATION_REDIRECT_URL || 'http://localhost:5174/login',
  cookieSecure:
    process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  cookieSameSite:
    process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
});

export function validateProductionConfig() {
  if (config.nodeEnv !== 'production') return;

  const missing = [
    ['SUPABASE_URL', config.supabaseUrl],
    ['SUPABASE_ANON_KEY', config.supabaseAnonKey],
    ['SUPABASE_SERVICE_KEY', config.supabaseServiceKey],
    ['CORS_ORIGIN', process.env.CORS_ORIGIN],
    ['PASSWORD_RESET_REDIRECT_URL', process.env.PASSWORD_RESET_REDIRECT_URL],
    ['EMAIL_VERIFICATION_REDIRECT_URL', process.env.EMAIL_VERIFICATION_REDIRECT_URL],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  if (config.corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN must list explicit deployed frontend origins in production');
  }
  for (const origin of config.corsOrigins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
      throw new Error(`CORS_ORIGIN must contain HTTPS origins without paths: ${origin}`);
    }
  }
  if (!config.cookieSecure) {
    throw new Error('COOKIE_SECURE must not be false in production');
  }
  if (!['lax', 'strict', 'none'].includes(config.cookieSameSite.toLowerCase())) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none');
  }
  if (config.cookieSameSite.toLowerCase() === 'none' && !config.cookieSecure) {
    throw new Error('COOKIE_SAME_SITE=none requires secure cookies');
  }
}
