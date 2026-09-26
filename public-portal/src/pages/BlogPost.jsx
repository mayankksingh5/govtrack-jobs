import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBlogPost, getBlogPosts, SITE_URL } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Icon from '../components/Icon.jsx';
import JobCard from '../components/JobCard.jsx';
import SEO, { breadcrumbSchema, SITE_NAME } from '../components/SEO.jsx';
import { ErrorState, PageSkeleton } from '../components/States.jsx';
import { SectionHeading } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { displayDate } from '../lib/jobs.js';
import { readingMinutes, renderMarkdown } from '../lib/markdown.js';

export default function BlogPost() {
  const { slug } = useParams();
  const loader = useCallback(async () => (await getBlogPost(slug)).data?.[0] || null, [slug]);
  const { data: post, loading, error, reload } = useRequest(loader, [loader]);
  const latest = useRequest(() => getBlogPosts({ page: 1, limit: 6 }), []);
  const html = useMemo(() => renderMarkdown(post?.body), [post?.body]);

  if (loading) return <PageSkeleton />;
  if (error || !post) {
    return <main className="listing-page"><div className="container"><ErrorState message={error || 'Article not found'} retry={reload} /></div></main>;
  }

  const path = `/blog/${post.slug}`;
  const description = post.excerpt || String(post.body || '').replace(/[#*_>`[\]()-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 155);
  const shareUrl = `${SITE_URL}${path}`;
  const others = (latest.data?.data || []).filter((item) => item.slug !== post.slug).slice(0, 4);

  return (
    <main className="detail-page">
      <SEO
        title={post.title}
        description={description}
        path={path}
        type="article"
        image={post.cover_image_url || undefined}
        published={post.published_at}
        modified={post.updated_at}
        schema={[
          breadcrumbSchema([{ name: 'Blog', path: '/blog' }, { name: post.title, path }]),
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description,
            datePublished: post.published_at,
            dateModified: post.updated_at || post.published_at,
            mainEntityOfPage: shareUrl,
            ...(post.cover_image_url && { image: [post.cover_image_url] }),
            keywords: (post.tags || []).join(', ') || undefined,
            author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
            publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` } },
          },
        ]}
      />
      <div className="container">
        <Breadcrumbs items={[{ label: 'Blog', to: '/blog' }, { label: post.title }]} />
        <div className="detail-layout">
          <div>
            <article className="info-card blog-article">
              <div className="title-meta">
                {(post.tags || []).map((tag) => <span className="badge" key={tag}>{tag}</span>)}
              </div>
              <h1>{post.title}</h1>
              <p className="blog-meta">
                {SITE_NAME} · {displayDate(post.published_at)} · {readingMinutes(post.body)} min read
              </p>
              {post.cover_image_url && <img className="blog-hero" src={post.cover_image_url} alt="" />}
              <div className="blog-body" dangerouslySetInnerHTML={{ __html: html }} />
              <div className="notice">
                <Icon name="verified" />
                <p>
                  <strong>Always verify before applying</strong>
                  <small>This article summarises official notifications. Dates and rules in the official notice take precedence.</small>
                </p>
              </div>
            </article>
            {post.related_job && (
              <section>
                <SectionHeading eyebrow="RELATED" title="Job mentioned in this article" />
                <div className="job-list"><JobCard job={post.related_job} /></div>
              </section>
            )}
          </div>
          <aside className="sidebar detail-side">
            <div className="side-card official-links">
              <div className="side-card-title">
                <div>
                  <span>SHARE</span>
                  <h3>Share this article</h3>
                </div>
              </div>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={16} /> WhatsApp <Icon name="arrow" size={15} />
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={16} /> Telegram <Icon name="arrow" size={15} />
              </a>
            </div>
            {others.length > 0 && (
              <div className="side-card quick-links">
                <div className="side-card-title">
                  <div>
                    <span>READ NEXT</span>
                    <h3>More articles</h3>
                  </div>
                </div>
                {others.map((item) => (
                  <Link key={item.id} to={`/blog/${item.slug}`}>
                    {item.title}
                    <Icon name="arrow" size={15} />
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
