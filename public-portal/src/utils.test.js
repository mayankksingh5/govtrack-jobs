import { describe, expect, it } from 'vitest';
import { findLink, formatDate, groupByCount, organizationFor, titleFor } from './utils.js';

describe('public utilities', () => {
  it('chooses job titles and organizations in priority order', () => {
    expect(titleFor({ title: 'Edited', raw_title: 'Raw' })).toBe('Edited');
    expect(titleFor({ raw_title: 'Raw' })).toBe('Raw');
    expect(titleFor({ post_name: 'Post' })).toBe('Post');
    expect(titleFor({ id: 7 })).toBe('Government Job #7');
    expect(organizationFor({ organization: 'ISRO' })).toBe('ISRO');
    expect(organizationFor({ source_name: 'RBI' })).toBe('RBI');
    expect(organizationFor({})).toBe('Government Organization');
  });

  it('formats dates and handles missing/invalid values', () => {
    expect(formatDate(null)).toBe('Not available');
    expect(formatDate('bad', '—')).toBe('—');
    expect(formatDate('2026-07-29')).toContain('2026');
  });

  it('finds only safe matching links', () => {
    const job = {
      important_links: [
        { label: 'Official Notification', url: 'https://example.com/file.pdf' },
        { label: 'Apply', url: 'javascript:alert(1)' },
      ],
    };
    expect(findLink(job, /notification/i)).toContain('https://');
    expect(findLink(job, /apply/i)).toBeUndefined();
    expect(findLink({}, /apply/i)).toBeUndefined();
  });

  it('groups and sorts populated values', () => {
    expect(groupByCount([{ v: 'B' }, { v: 'A' }, { v: 'A' }, {}], (item) => item.v))
      .toEqual([['A', 2], ['B', 1]]);
  });
});
