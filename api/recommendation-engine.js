const DAY_MS = 86_400_000;
const cache = new Map();
const CACHE_TTL_MS = 5 * 60_000;

const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
const includesAny = (text, values = []) => values.some((value) => text.includes(normalize(value)));
const organization = (job) => job.organization || job.source_name || '';
const category = (job) => job.type || 'other';
const jobText = (job) =>
  normalize(
    [job.title, job.raw_title, job.post_name, job.short_info, job.qualification, organization(job)]
      .filter(Boolean)
      .join(' ')
  );

export function scoreJob(job, preferences = {}, history = []) {
  const text = jobText(job);
  const reasons = [];
  let score = 0;

  if (preferences.qualification && text.includes(normalize(preferences.qualification))) {
    score += 25;
    reasons.push({ factor: 'qualification', points: 25 });
  }
  if (includesAny(text, preferences.skills)) {
    score += 15;
    reasons.push({ factor: 'skills', points: 15 });
  }
  if ((preferences.preferred_categories || []).map(normalize).includes(normalize(category(job)))) {
    score += 20;
    reasons.push({ factor: 'category', points: 20 });
  }
  if (
    (preferences.preferred_organizations || [])
      .map(normalize)
      .includes(normalize(organization(job)))
  ) {
    score += 20;
    reasons.push({ factor: 'organization', points: 20 });
  }
  if (includesAny(text, preferences.preferred_states)) {
    score += 10;
    reasons.push({ factor: 'state', points: 10 });
  }

  const publishedAt = new Date(job.published_at || job.updated_at || 0).getTime();
  if (Number.isFinite(publishedAt) && publishedAt > 0) {
    const ageDays = Math.max(0, (Date.now() - publishedAt) / DAY_MS);
    const recency = Math.max(0, Math.round(15 * (1 - Math.min(ageDays, 30) / 30)));
    score += recency;
    if (recency) reasons.push({ factor: 'recency', points: recency });
  }

  const relatedHistory = history.filter(
    (entry) =>
      normalize(entry.organization) === normalize(organization(job)) ||
      normalize(entry.category) === normalize(category(job))
  );
  if (relatedHistory.length) {
    const interactionPoints = Math.min(
      15,
      relatedHistory.reduce(
        (total, entry) => total + (entry.interaction === 'saved' ? 5 : 2),
        0
      )
    );
    score += interactionPoints;
    reasons.push({ factor: 'interaction_history', points: interactionPoints });
  }

  return {
    ...job,
    recommendation_score: Math.min(score, 100),
    recommendation_reasons: reasons,
    unavailable_factors: [
      ...(preferences.experience_years != null ? ['experience'] : []),
      ...(preferences.preferred_salary_min != null || preferences.preferred_salary_max != null
        ? ['salary']
        : []),
    ],
  };
}

export function rankJobs(jobs, preferences, history) {
  return jobs
    .map((job) => scoreJob(job, preferences, history))
    .sort(
      (left, right) =>
        right.recommendation_score - left.recommendation_score ||
        new Date(right.published_at || 0) - new Date(left.published_at || 0)
    );
}

export function similarJobs(target, jobs) {
  const targetText = jobText(target);
  return jobs
    .filter((job) => job.id !== target.id)
    .map((job) => {
      let score = 0;
      const reasons = [];
      if (normalize(category(job)) === normalize(category(target))) {
        score += 40;
        reasons.push({ factor: 'same_category', points: 40 });
      }
      if (normalize(organization(job)) === normalize(organization(target))) {
        score += 35;
        reasons.push({ factor: 'same_organization', points: 35 });
      }
      const tokens = new Set(targetText.split(' ').filter((token) => token.length > 3));
      const overlap = jobText(job)
        .split(' ')
        .filter((token) => tokens.has(token)).length;
      const textPoints = Math.min(25, overlap * 3);
      score += textPoints;
      if (textPoints) reasons.push({ factor: 'title_and_details', points: textPoints });
      return { ...job, recommendation_score: score, recommendation_reasons: reasons };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score);
}

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateUserCache(userId) {
  for (const key of cache.keys()) if (key.startsWith(`${userId}:`)) cache.delete(key);
}
