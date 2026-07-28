import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCached,
  invalidateUserCache,
  rankJobs,
  scoreJob,
  setCached,
  similarJobs,
} from '../../api/recommendation-engine.js';

const now = new Date('2026-07-29T00:00:00Z');

describe('recommendation engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => vi.useRealTimers());

  it('scores every available preference factor and explains the result', () => {
    const result = scoreJob(
      {
        id: 1,
        title: 'ISRO Civil Engineer B.Tech Delhi',
        organization: 'ISRO',
        type: 'job',
        published_at: now.toISOString(),
      },
      {
        qualification: 'B.Tech',
        skills: ['Civil Engineer'],
        preferred_categories: ['JOB'],
        preferred_organizations: ['isro'],
        preferred_states: ['Delhi'],
      },
      [{ organization: 'ISRO', category: 'job', interaction: 'saved' }]
    );
    expect(result.recommendation_score).toBe(100);
    expect(result.recommendation_reasons.map((reason) => reason.factor)).toEqual(
      expect.arrayContaining([
        'qualification',
        'skills',
        'category',
        'organization',
        'state',
        'recency',
        'interaction_history',
      ])
    );
  });

  it('reports unsupported structured factors and handles empty content', () => {
    const result = scoreJob(
      { id: 2, published_at: null },
      { experience_years: 3, preferred_salary_min: 1000, preferred_salary_max: 2000 },
      []
    );
    expect(result.recommendation_score).toBe(0);
    expect(result.unavailable_factors).toEqual(['experience', 'salary']);
  });

  it('decays recency and caps interaction influence', () => {
    const history = Array.from({ length: 10 }, () => ({
      organization: 'RBI',
      category: 'job',
      interaction: 'saved',
    }));
    const result = scoreJob(
      {
        organization: 'RBI',
        type: 'job',
        published_at: new Date(now.getTime() - 60 * 86_400_000).toISOString(),
      },
      {},
      history
    );
    expect(result.recommendation_score).toBe(15);
    expect(result.recommendation_reasons).toEqual([
      { factor: 'interaction_history', points: 15 },
    ]);
  });

  it('ranks by score then publication date', () => {
    const jobs = [
      { id: 1, organization: 'Other', type: 'job', published_at: '2026-07-29' },
      { id: 2, organization: 'ISRO', type: 'job', published_at: '2026-07-20' },
    ];
    expect(
      rankJobs(jobs, { preferred_organizations: ['ISRO'] }, []).map((job) => job.id)
    ).toEqual([2, 1]);
  });

  it('finds similar jobs using category, organization, and text overlap', () => {
    const target = {
      id: 1,
      title: 'Civil Engineer Recruitment',
      organization: 'ISRO',
      type: 'job',
    };
    const results = similarJobs(target, [
      target,
      { id: 2, title: 'Civil Engineer Vacancy', organization: 'ISRO', type: 'job' },
      { id: 3, title: 'Clerk Result', organization: 'RBI', type: 'result' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(2);
    expect(results[0].recommendation_score).toBeGreaterThan(70);
  });

  it('stores, expires, and invalidates cached user results', () => {
    setCached('user-a:one', { data: [1] });
    setCached('user-b:one', { data: [2] });
    expect(getCached('user-a:one')).toEqual({ data: [1] });
    invalidateUserCache('user-a');
    expect(getCached('user-a:one')).toBeNull();
    expect(getCached('user-b:one')).toEqual({ data: [2] });
    vi.advanceTimersByTime(300_001);
    expect(getCached('user-b:one')).toBeNull();
    expect(getCached('missing')).toBeNull();
  });
});
