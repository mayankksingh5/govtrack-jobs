import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/* Blog Markdown -> sanitised HTML (scripts, event handlers and iframes removed). */
export function renderMarkdown(source) {
  const html = marked.parse(String(source || ''));
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  // External links open in a new tab without passing referrer/opener.
  return clean.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
}

/* Rough reading time for the article header. */
export const readingMinutes = (source) => Math.max(1, Math.round(String(source || '').split(/\s+/).length / 200));
