import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAdminBlogPost, saveAdminBlogPost, SITE_URL } from '../../api.js';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import { ErrorState, PageSkeleton } from '../../components/States.jsx';
import { Badge } from '../../components/UI.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { slugify } from '../../lib/slug.js';

const BLANK = { title: '', slug: '', excerpt: '', body: '', cover_image_url: '', tags: '', related_job_id: '', status: 'draft' };

const toForm = (post) => ({
  ...BLANK,
  ...post,
  excerpt: post.excerpt || '',
  cover_image_url: post.cover_image_url || '',
  tags: (post.tags || []).join(', '),
  related_job_id: post.related_job_id ?? '',
});

/* Character counter with the length search engines show comfortably. */
function Count({ value, ideal }) {
  const length = value.length;
  return <small className={`seo-count ${length > ideal ? 'over' : ''}`}>{length}/{ideal}</small>;
}

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const loader = useCallback(async () => (isNew ? BLANK : (await getAdminBlogPost(id)).data?.[0] || null), [id, isNew]);
  const { data: post, loading, error, reload } = useRequest(loader, [loader]);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState('write');
  const [message, setMessage] = useState({ text: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (post) setForm(toForm(post)); }, [post]);
  const preview = useMemo(() => renderMarkdown(form?.body), [form?.body]);

  if (loading || (post && !form)) return <PageSkeleton />;
  if (error || !post) return <main className="listing-page"><div className="container"><ErrorState message={error || 'Article not found'} retry={reload} /></div></main>;

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const slug = form.slug ? slugify(form.slug) : slugify(form.title);
  const description = form.excerpt || form.body.replace(/[#*_>`[\]()-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 155);

  const save = async (status) => {
    if (form.title.trim().length < 5) return setMessage({ text: 'Title must be at least 5 characters.', error: true });
    setSaving(true);
    setMessage({ text: 'Saving…' });
    try {
      const saved = (await saveAdminBlogPost(isNew ? null : post.id, { ...form, slug, status })).data?.[0];
      if (isNew) return navigate(`/admin/blog/${saved.id}`, { replace: true });
      setMessage({ text: status === 'published' ? 'Published. The article is live.' : 'Saved as draft.' });
      reload();
    } catch (saveError) {
      setMessage({ text: saveError.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="detail-page">
      <Helmet><title>{`${isNew ? 'New article' : 'Edit article'} | GovTrack Jobs`}</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Blog', to: '/admin/blog' }, { label: isNew ? 'New article' : form.title || 'Edit' }]} />
        <div className="detail-layout">
          <form className="info-card form-grid two" onSubmit={(event) => { event.preventDefault(); save('published'); }}>
            <label className="field span-2">
              <span>Title <Count value={form.title} ideal={60} /></span>
              <input required minLength="5" maxLength="200" value={form.title} onChange={set('title')} placeholder="e.g. SSC CGL 2026: Eligibility, Exam Pattern and Last Date" />
            </label>
            <label className="field">
              <span>URL (slug)</span>
              <input value={form.slug} onChange={set('slug')} placeholder={slugify(form.title) || 'auto from title'} />
            </label>
            <label className="field">
              <span>Related job ID (optional)</span>
              <input type="number" min="1" value={form.related_job_id} onChange={set('related_job_id')} placeholder="e.g. 42" />
            </label>
            <label className="field span-2">
              <span>Summary / meta description <Count value={form.excerpt} ideal={155} /></span>
              <textarea rows="2" maxLength="300" value={form.excerpt} onChange={set('excerpt')} placeholder="One or two sentences shown on Google and in the blog list." />
            </label>
            <label className="field">
              <span>Cover image URL (https, optional)</span>
              <input type="url" value={form.cover_image_url} onChange={set('cover_image_url')} placeholder="https://…" />
            </label>
            <label className="field">
              <span>Tags (comma separated)</span>
              <input value={form.tags} onChange={set('tags')} placeholder="SSC, CGL, Preparation" />
            </label>
            <div className="field span-2">
              <span>Article (Markdown: ## heading, **bold**, - list, [link](https://…))</span>
              <div className="info-tabs editor-tabs">
                {[['write', 'Write'], ['preview', 'Preview']].map(([key, label]) => (
                  <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
                ))}
              </div>
              {tab === 'write' ? (
                <textarea className="editor-body" rows="18" value={form.body} onChange={set('body')} placeholder={'## Overview\n\nWrite the article here…'} />
              ) : (
                <div className="blog-body editor-preview" dangerouslySetInnerHTML={{ __html: preview || '<p>Nothing to preview yet.</p>' }} />
              )}
            </div>
          </form>
          <aside className="sidebar detail-side">
            <div className="side-card apply-card">
              <span>STATUS</span>
              <div className="title-meta preview-badges">
                <Badge status={isNew ? 'New' : post.status === 'published' ? 'Published' : 'Pending'} />
              </div>
              <button className="button primary" disabled={saving} onClick={() => save('published')}>
                {post.status === 'published' ? 'Update article' : 'Publish'}
              </button>
              <div className="admin-actions">
                <button className="button secondary" disabled={saving} onClick={() => save('draft')}>
                  {post.status === 'published' ? 'Unpublish' : 'Save draft'}
                </button>
                {!isNew && post.status === 'published' && <Link className="button secondary" to={`/blog/${post.slug}`}>View</Link>}
              </div>
              {message.text && <p className={`form-message ${message.error ? 'error' : ''}`} role="status">{message.text}</p>}
            </div>
            <div className="side-card seo-preview">
              <div className="side-card-title">
                <div>
                  <span>SEO</span>
                  <h3>Google preview</h3>
                </div>
              </div>
              <div className="serp">
                <small>{SITE_URL.replace(/^https?:\/\//, '')} › blog › {slug || '…'}</small>
                <strong>{(form.title || 'Article title').slice(0, 60)}{form.title.length > 60 ? '…' : ''} | GovTrack Jobs</strong>
                <p>{(description || 'Add a summary so Google shows a clear description.').slice(0, 155)}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
