import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute } from './middleware.js';

export const requireAuth = asyncRoute(async (req, _res, next) => {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Access token required');

  const db = getRecommendationDb();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired');

  const { data: profile, error: profileError } = await db
    .from('user_profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (profileError) throw new ApiError(500, 'PROFILE_LOOKUP_FAILED', 'Unable to load user profile');

  req.auth = { user: data.user, token, role: profile?.role || 'user' };
  next();
});

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.auth?.role !== role) {
      return next(new ApiError(403, 'FORBIDDEN', `${role} role required`));
    }
    next();
  };
}
