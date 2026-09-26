import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBlogPosts, SITE_URL } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO, { breadcrumbSchema } from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { displayDate } from '../lib/jobs.js';

export function BlogCard({ post }) {
  return (
    <article className="blog-card">
      {post.cover_image_url && (
        <Link to={`/blog/${post.slug}`} className="blog-cover" tabIndex="-1" aria-hidden="true">
          <img src={post.cover_image_url} alt="" loading="lazy" />
        </Link>
      )}
      <div className="blog-card-body">
        <div className="title-meta">
          {(post.tags || []).slice(0, 3).map((tag) => <span className="badge" key={tag}>{tag}</span>)}
        </div>
        <h2><Link to={`/blog/${post.slug}`}>{post.title}</Link></h2>
        {post.excerpt && <p>{post.excerpt}</p>}
        <div className="blog-card-foot">
          <small>{displayDate(post.published_at)}</small>
          <Link className="text-link" to={`/blog/${post.slug}`}>Read article <Icon name="arrow" size={14} /></Link>
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  const [page, setPage] = useState(1);
  const loader = useCallback(() => getBlogPosts({ page, limit: 12 }), [page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  const posts = data?.data || [];
  return (
    <main className="listing-page">
      <SEO
        title="Blog — Government Job Guides, Exam Tips & Updates"
        description="Guides on government job notifications, eligibility, exam patterns and preparation tips, written from official notifications."
        path="/blog"
        schema={[
          breadcrumbSchema([{ name: 'Blog', path: '/blog' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'GovTrack Jobs Blog',
            url: `${SITE_URL}/blog`,
            blogPost: posts.map((post) => ({
              '@type': 'BlogPosting',
              headline: post.title,
              url: `${SITE_URL}/blog/${post.slug}`,
              datePublished: post.published_at,
            })),
          },
        ]}
      />
      <div className="container">
        <Breadcrumbs items={[{ label: 'Blog' }]} />
        <div className="listing-title">
          <div>
            <span>GUIDES &amp; UPDATES</span>
            <h1>GovTrack Blog</h1>
            <p>Explainers on recruitments, eligibility, exam patterns and preparation — based on official notifications.</p>
          </div>
        </div>
        {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : posts.length ? (
          <>
            <div className="blog-grid">{posts.map((post) => <BlogCard key={post.id} post={post} />)}</div>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} />
          </>
        ) : <EmptyState title="No articles yet" description="New guides and exam updates will appear here soon." />}
      </div>
    </main>
  );
}
