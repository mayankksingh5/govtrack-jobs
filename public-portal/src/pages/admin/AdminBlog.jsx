import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { getAdminBlogPosts } from '../../api.js';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../../components/States.jsx';
import { Badge, SectionHeading } from '../../components/UI.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { timeAgo } from '../../lib/jobs.js';

export default function AdminBlog() {
  const { data, loading, error, reload } = useRequest(getAdminBlogPosts, []);
  const posts = data?.data || [];
  return (
    <main className="listing-page">
      <Helmet><title>Blog | GovTrack Jobs</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Blog' }]} />
        <div className="listing-title">
          <div>
            <span>CONTENT</span>
            <h1>Blog articles</h1>
            <p>Write guides and updates about jobs. Drafts stay hidden until you publish them.</p>
          </div>
          <div className="admin-header-actions">
            <Link className="button primary" to="/admin/blog/new">+ New article</Link>
            <Link className="button secondary" to="/admin">Back to jobs</Link>
          </div>
        </div>
        <section className="calendar-list">
          <SectionHeading eyebrow="ALL ARTICLES" title="Drafts & published" count={posts.length} />
          {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : data?.meta?.enabled === false ? (
            <EmptyState title="Blog is not switched on yet" description="Run migrations/2026-09-26-blog.sql once in the Supabase SQL Editor." />
          ) : posts.length ? posts.map((post) => (
            <div className="calendar-list-row admin-row" key={post.id}>
              <span className="mini-mark">{post.status === 'published' ? 'LIVE' : 'DRAFT'}</span>
              <span />
              <span className="cal-main">
                <Badge status={post.status === 'published' ? 'Published' : 'Pending'} />
                <Link to={`/admin/blog/${post.id}`}><strong>{post.title}</strong></Link>
                <small>/blog/{post.slug} · updated {timeAgo(post.updated_at)}</small>
              </span>
              <span className="admin-row-actions">
                {post.status === 'published' && <Link className="button secondary" to={`/blog/${post.slug}`}>View</Link>}
                <Link className="button primary" to={`/admin/blog/${post.id}`}>Edit</Link>
              </span>
            </div>
          )) : <EmptyState title="No articles yet" description="Click “+ New article” to write the first one." />}
        </section>
      </div>
    </main>
  );
}
