import { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminPosts, getAdminSummary, setAdminPostStatus } from '../../api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import Icon from '../../components/Icon.jsx';
import Pagination from '../../components/Pagination.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../../components/States.jsx';
import { Badge, SectionHeading } from '../../components/UI.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { displayDate, MONTHS_SHORT, orgMarkFor, parseDate, timeAgo } from '../../lib/jobs.js';

export const TYPE_LABELS = { job: 'Job', admit_card: 'Admit Card', result: 'Result', answer_key: 'Answer Key', other: 'Other' };
const TABS = [['pending', 'Pending review'], ['published', 'Published'], ['rejected', 'Rejected']];

function CrawlerHealth({ sources }) {
  return (
    <div className="side-card">
      <div className="side-card-title">
        <div>
          <span>CRAWLERS</span>
          <h3>Source health</h3>
        </div>
        <Icon name="clock" />
      </div>
      {sources.length ? sources.map((run) => (
        <div className="update-row" key={run.source_id}>
          <span className="mini-mark">{run.source_id.slice(0, 3).toUpperCase()}</span>
          <span>
            <Badge status={run.ok ? 'Healthy' : 'Failing'} />
            <strong>{run.source_id}</strong>
            <small>
              {run.ok ? `${run.links_found} links · ${run.new_items} new` : run.error || 'Run failed'} · {timeAgo(run.ran_at)}
            </small>
          </span>
        </div>
      )) : <p className="side-empty">No crawler runs recorded yet. Runs appear here once the scraper workflow is enabled.</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = TABS.some(([key]) => key === params.get('status')) ? params.get('status') : 'pending';
  const page = Number(params.get('page')) || 1;
  const [query, setQuery] = useState(params.get('q') || '');

  const summary = useRequest(getAdminSummary, []);
  const loader = useCallback(
    () => getAdminPosts({ status, page, limit: 20, q: params.get('q') || undefined }),
    [status, page, params]
  );
  const posts = useRequest(loader, [loader]);
  const counts = summary.data?.data?.[0]?.by_status || {};
  const sources = summary.data?.data?.[0]?.sources || [];
  const failing = sources.filter((run) => !run.ok).length;

  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const changeStatus = async (id, next) => {
    setBusy(id);
    setActionError('');
    try {
      await setAdminPostStatus(id, next);
      posts.reload();
      summary.reload();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(null);
    }
  };

  const go = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <main className="listing-page">
      <Helmet><title>Admin dashboard | GovTrack Jobs</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Admin' }]} />
        <div className="listing-title">
          <div>
            <span>EDITORIAL REVIEW</span>
            <h1>Admin dashboard</h1>
            <p>Scraped updates wait here until an editor completes the details and publishes them.</p>
          </div>
          <button className="button secondary" onClick={logout}>Logout</button>
        </div>
        <section className="key-facts">
          <div><span>PENDING REVIEW</span><strong>{counts.pending ?? '—'}</strong><small>Auto-detected by crawlers</small></div>
          <div><span>PUBLISHED</span><strong>{counts.published ?? '—'}</strong><small>Live on the website</small></div>
          <div><span>REJECTED</span><strong>{counts.rejected ?? '—'}</strong><small>Hidden from the website</small></div>
          <div><span>FAILING SOURCES</span><strong className={failing ? 'urgent' : ''}>{summary.loading ? '—' : failing}</strong><small>Latest crawler run</small></div>
        </section>
        <div className="filter-strip admin-toolbar">
          <div>
            {TABS.map(([key, label]) => (
              <button key={key} className={status === key ? 'active' : ''} onClick={() => go({ status: key === 'pending' ? '' : key })}>
                {label}
              </button>
            ))}
          </div>
          <form className="header-search" role="search" onSubmit={(event) => { event.preventDefault(); go({ q: query.trim() }); }}>
            <Icon name="search" size={18} />
            <input aria-label="Search posts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or source…" />
          </form>
        </div>
        <div className="content-grid">
          <section className="calendar-list">
            <SectionHeading
              eyebrow={status === 'pending' ? 'NEEDS ATTENTION' : status.toUpperCase()}
              title={TABS.find(([key]) => key === status)[1]}
              count={posts.data?.total}
            />
            {posts.loading ? <PageSkeleton /> : posts.error ? <ErrorState message={posts.error} retry={posts.reload} /> : posts.data.data.length ? (
              <>
                {actionError && <p className="form-message error" role="alert">{actionError}</p>}
                {posts.data.data.map((post) => {
                  const seen = parseDate(post.first_seen_at);
                  const reviewPath = `/admin/posts/${post.id}`;
                  return (
                    <div className="calendar-list-row admin-row" key={post.id}>
                      <span className="date-block">
                        <strong>{seen ? seen.getDate() : '—'}</strong>
                        <small>{seen ? MONTHS_SHORT[seen.getMonth()].toUpperCase() : ''}</small>
                      </span>
                      <span className="mini-mark">{orgMarkFor({ organization: post.organization || post.source_name })}</span>
                      <span className="cal-main">
                        <Badge status={TYPE_LABELS[post.type] || 'Other'} />
                        <Link to={reviewPath}><strong>{post.title || post.raw_title}</strong></Link>
                        <small>{post.source_name} · #{post.id} · {status === 'published' ? `published ${displayDate(post.published_at)}` : `found ${timeAgo(post.first_seen_at)}`}</small>
                      </span>
                      <span className="admin-row-actions">
                        {status === 'published' ? (
                          <>
                            <Link className="button secondary" to={`/jobs/${post.id}`}>View</Link>
                            <Link className="button primary" to={reviewPath}>Edit</Link>
                          </>
                        ) : (
                          <>
                            {post.url && (
                              <a className="button secondary" href={post.url} target="_blank" rel="noopener noreferrer">
                                Source <Icon name="external" size={13} />
                              </a>
                            )}
                            {status === 'pending' ? (
                              <button className="button secondary danger" disabled={busy === post.id} onClick={() => changeStatus(post.id, 'rejected')}>
                                Reject
                              </button>
                            ) : (
                              <button className="button secondary" disabled={busy === post.id} onClick={() => changeStatus(post.id, 'pending')}>
                                Restore
                              </button>
                            )}
                            <Link className="button primary" to={reviewPath}>Review</Link>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
                <Pagination page={posts.data.page} pages={posts.data.pages} onChange={(value) => go({ page: String(value) })} />
              </>
            ) : <EmptyState title={status === 'pending' ? 'Nothing waiting for review' : `No ${status} posts`} description="New crawler finds will show up here." />}
          </section>
          <aside className="sidebar">
            {summary.error ? <ErrorState message={summary.error} retry={summary.reload} /> : <CrawlerHealth sources={sources} />}
          </aside>
        </div>
      </div>
    </main>
  );
}
