const CATEGORY_VALUES = new Set([
  'job',
  'admit_card',
  'result',
  'answer_key',
  'other',
]);
const SEARCH_PATTERN = /^[\p{L}\p{N}\s.'’&+/-]+$/u;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseInteger(value, name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function parseText(value, name, { max = 120, required = false } = {}) {
  if (value == null || String(value).trim() === '') {
    if (required) throw new ApiError(400, 'INVALID_INPUT', `${name} is required`);
    return null;
  }
  const parsed = String(value).trim();
  if (parsed.length > max) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must be at most ${max} characters`);
  }
  return parsed;
}

export function validateListQuery(req, _res, next) {
  try {
    const page = parseInteger(req.query.page, 'page', 1);
    const limit = parseInteger(req.query.limit, 'limit', 20, { min: 1, max: 100 });
    const sort = parseText(req.query.sort, 'sort') || 'newest';
    if (sort !== 'newest') {
      throw new ApiError(400, 'INVALID_INPUT', 'sort must be newest');
    }

    const category = parseText(req.query.category, 'category', { max: 30 });
    if (category && !CATEGORY_VALUES.has(category)) {
      throw new ApiError(
        400,
        'INVALID_INPUT',
        `category must be one of: ${[...CATEGORY_VALUES].join(', ')}`
      );
    }

    req.validated = {
      page,
      limit,
      sort,
      category,
      organization: parseText(req.query.organization, 'organization'),
      qualification: parseText(req.query.qualification, 'qualification', { max: 180 }),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateSearchQuery(req, _res, next) {
  try {
    const q = parseText(req.query.q, 'q', { required: true, max: 100 });
    if (!SEARCH_PATTERN.test(q)) {
      throw new ApiError(
        400,
        'INVALID_INPUT',
        'q contains unsupported characters'
      );
    }
    req.validated = {
      q,
      page: parseInteger(req.query.page, 'page', 1),
      limit: parseInteger(req.query.limit, 'limit', 20, { min: 1, max: 100 }),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateId(req, _res, next) {
  try {
    req.validated = {
      id: parseInteger(req.params.id, 'id', null),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;
  if (isServerError) console.error(error);

  res.status(status).json({
    success: false,
    error: {
      code: error.code || (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: isServerError ? 'Internal server error' : error.message,
    },
  });
}
