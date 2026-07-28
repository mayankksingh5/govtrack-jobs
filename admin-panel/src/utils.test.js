import { describe, expect, it } from 'vitest';
import { findLink, formatDate, groupCount, jobTitle } from './utils.js';

describe('admin utilities', () => {
  it('formats titles and dates with fallbacks', () => {
    expect(jobTitle({ title: 'Title' })).toBe('Title');
    expect(jobTitle({ raw_title: 'Raw' })).toBe('Raw');
    expect(jobTitle({ post_name: 'Post' })).toBe('Post');
    expect(jobTitle({ id: 4 })).toBe('Job #4');
    expect(formatDate(null)).toBe('Not available');
    expect(formatDate('bad', '—')).toBe('—');
    expect(formatDate('2026-07-29')).toContain('2026');
  });

  it('finds safe links and groups unknown values', () => {
    expect(findLink({ important_links: [{ label: 'Apply', url: 'https://apply.test' }] }, /apply/i)).toBe('https://apply.test');
    expect(findLink({ important_links: [{ label: 'Apply', url: 'javascript:x' }] }, /apply/i)).toBeUndefined();
    expect(groupCount([{ x: 'A' }, { x: 'A' }, {}], (item) => item.x)).toEqual([['A', 2], ['Unknown', 1]]);
  });
});
