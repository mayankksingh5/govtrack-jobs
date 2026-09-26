import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createAdminPost, getAdminPost, updateAdminPost } from '../../api.js';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import Icon from '../../components/Icon.jsx';
import { ErrorState, PageSkeleton } from '../../components/States.jsx';
import { Badge, SectorBadge } from '../../components/UI.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { statusOf, timeAgo } from '../../lib/jobs.js';
import { sectorOf } from '../../lib/sectors.js';
import { TYPE_LABELS } from './AdminDashboard.jsx';
import { jobPath } from '../../lib/slug.js';

// Blank form for "Add a job" (/admin/posts/new).
const NEW_POST = { id: null, type: 'job', status: 'pending', raw_title: '', url: '', source_name: '', important_links: [] };

const DEFAULT_LINK_LABEL = {
  job: 'Official notification',
  admit_card: 'Download admit card',
  result: 'Download result',
  answer_key: 'Download answer key',
  other: 'Official notice',
};

const TEXT_FIELDS = [
  ['title', 'Title (shown on the website)', 'span-2'],
  ['organization', 'Organization'],
  ['post_name', 'Post name'],
  ['qualification', 'Qualification'],
  ['age_limit', 'Age limit'],
  ['fee_info', 'Application fee', 'span-2'],
];
const DATE_FIELDS = [['apply_start', 'Application start'], ['last_date', 'Last date'], ['exam_date', 'Exam date']];

function formFor(post) {
  return {
    type: post.type || 'job',
    title: post.title || post.raw_title || '',
    organization: post.organization || post.source_name || '',
    post_name: post.post_name || '',
    short_info: post.short_info || '',
    qualification: post.qualification || '',
    age_limit: post.age_limit || '',
    fee_info: post.fee_info || '',
    apply_start: post.apply_start || '',
    last_date: post.last_date || '',
    exam_date: post.exam_date || '',
    total_vacancy: post.total_vacancy ?? '',
    is_featured: Boolean(post.is_featured),
    important_links: post.important_links?.length
      ? post.important_links
      : [{ label: DEFAULT_LINK_LABEL[post.type] || 'Official notice', url: post.url || '' }],
  };
}

export default function AdminReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const loader = useCallback(
    async () => (isNew ? NEW_POST : (await getAdminPost(id)).data?.[0] || null),
    [id, isNew]
  );
  const { data: post, loading, error, reload } = useRequest(loader, [loader]);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState({ text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (post) setForm(formFor(post)); }, [post]);

  if (loading || (post && !form)) return <PageSkeleton />;
  if (error || !post) {
    return <main className="listing-page"><div className="container"><ErrorState message={error || 'Post not found'} retry={reload} /></div></main>;
  }

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  const setLink = (index, key, value) =>
    setForm({ ...form, important_links: form.important_links.map((link, i) => (i === index ? { ...link, [key]: value } : link)) });
  const preview = { ...post, ...form, organization: form.organization, title: form.title };
  const sector = sectorOf(preview);

  const save = async (status) => {
    if (status === 'published' && !form.title.trim()) return setMessage({ text: 'Add a title before publishing.', error: true });
    setSaving(true);
    setMessage({ text: 'Saving…' });
    try {
      if (isNew) {
        const created = (await createAdminPost({ ...form, status })).data?.[0];
        return navigate(`/admin/posts/${created.id}`, { replace: true });
      }
      const response = await updateAdminPost(post.id, { ...form, status });
      const saved = response.data?.[0];
      if (status === 'rejected') return navigate('/admin', { replace: true });
      setMessage({ text: status === 'published' ? 'Published. It is now live on the website.' : 'Saved as pending.' });
      if (saved) setForm(formFor(saved));
      reload();
    } catch (saveError) {
      setMessage({ text: saveError.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="detail-page">
      <Helmet><title>{`${isNew ? 'Add a job' : `Review #${post.id}`} | GovTrack Jobs`}</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: isNew ? 'Add a job' : `Review #${post.id}` }]} />
        <section className={`detail-header sector-context sector-${sector}`}>
          <div className="detail-title-wrap">
            <div>
              <div className="title-meta">
                <Badge status={isNew ? 'New' : post.status === 'published' ? 'Published' : post.status === 'rejected' ? 'Rejected' : 'Pending'} />
                <Badge status={TYPE_LABELS[form.type] || 'Other'} />
              </div>
              <h1>{isNew ? 'Add a job, admit card or result' : post.raw_title}</h1>
              <p>{isNew ? 'Copy the details from the official notification and paste its link below.' : `Found on ${post.source_name} · ${timeAgo(post.first_seen_at)}`}</p>
            </div>
          </div>
          <div className="verification-banner">
            <Icon name="verified" />
            <p>
              <strong>Check every detail against the official source</strong>
              <small>Only publish dates, vacancies and links you have confirmed in the notification.</small>
            </p>
            {post.url && (
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                Open source page <Icon name="external" size={14} />
              </a>
            )}
          </div>
        </section>
        <div className="detail-layout">
          <form className="info-card form-grid two" onSubmit={(event) => { event.preventDefault(); save('published'); }}>
            <label className="field">
              <span>Type</span>
              <select value={form.type} onChange={set('type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Total vacancy</span>
              <input type="number" min="0" value={form.total_vacancy} onChange={set('total_vacancy')} />
            </label>
            {TEXT_FIELDS.map(([key, label, span]) => (
              <label className={`field ${span || ''}`} key={key}>
                <span>{label}</span>
                <input value={form[key]} onChange={set(key)} required={key === 'title'} />
              </label>
            ))}
            <label className="field span-2">
              <span>Short info (meta description, max 500)</span>
              <textarea rows="3" maxLength="500" value={form.short_info} onChange={set('short_info')} />
            </label>
            {DATE_FIELDS.map(([key, label]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <input type="date" value={form[key]} onChange={set(key)} />
              </label>
            ))}
            <label className="field checkbox-field">
              <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} />
              <span>Featured</span>
            </label>
            <div className="field span-2">
              <span>Official links (at least one to publish)</span>
              {form.important_links.map((link, index) => (
                <div className="link-row" key={index}>
                  <input aria-label="Link label" value={link.label} onChange={(event) => setLink(index, 'label', event.target.value)} placeholder="Button text" />
                  <input aria-label="Link URL" type="url" value={link.url} onChange={(event) => setLink(index, 'url', event.target.value)} placeholder="https://" />
                  <button type="button" className="button secondary" aria-label="Remove link"
                    onClick={() => setForm({ ...form, important_links: form.important_links.filter((_, i) => i !== index) })}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="button secondary add-link"
                onClick={() => setForm({ ...form, important_links: [...form.important_links, { label: '', url: '' }] })}>
                + Add link
              </button>
            </div>
          </form>
          <aside className="sidebar detail-side">
            <div className="side-card apply-card">
              <span>ON THE WEBSITE</span>
              <div className="title-meta preview-badges">
                <Badge status={statusOf(preview)} />
                <SectorBadge sector={sector} />
              </div>
              <h3>{form.title || post.raw_title}</h3>
              <button className="button primary" disabled={saving} onClick={() => save('published')}>
                {post.status === 'published' ? 'Update live post' : 'Publish'}
              </button>
              <div className="admin-actions">
                <button className="button secondary" disabled={saving} onClick={() => save('pending')}>
                  {post.status === 'published' ? 'Unpublish' : 'Save as pending'}
                </button>
                {!isNew && (
                  <button className="button secondary danger" disabled={saving} onClick={() => save('rejected')}>Reject</button>
                )}
              </div>
              {message.text && <p className={`form-message ${message.error ? 'error' : ''}`} role="status">{message.text}</p>}
              {post.status === 'published' && <small><Link className="text-link" to={jobPath(post)}>View live page</Link></small>}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
