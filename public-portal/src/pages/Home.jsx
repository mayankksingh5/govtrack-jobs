import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs, SITE_URL } from '../api.js';
import Icon from '../components/Icon.jsx';
import JobCard, { CompactCard } from '../components/JobCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { Badge, SectionHeading, SectorCard } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { newestFirst } from '../lib/filters.js';
import { daysUntil, displayDate, isOpen, orgMarkFor, parseDate, statusOf, timeAgo, vacanciesFor } from '../lib/jobs.js';
import { HOME_SECTORS, POPULAR_SECTORS, SECTORS, sectorOf } from '../lib/sectors.js';
import { titleFor } from '../utils.js';
import { jobPath } from '../lib/slug.js';

const STATUSES = ['All', 'Upcoming', 'Active', 'Closing Soon', 'Admit Card', 'Exam', 'Answer Key', 'Result', 'Cut Off'];

function SearchHero() {
  return (
    <section className="hero">
      <div className="hero-orb orb-one" />
      <div className="hero-orb orb-two" />
      <div className="container hero-inner">
        <div className="hero-eyebrow"><span /> Verified updates, simplified for you</div>
        <h1>
          Government Jobs &amp; Exams
          <br />
          <em>All Updates in One Place</em>
        </h1>
        <p>Find upcoming notifications, active forms, admit cards, results and exam updates from official sources.</p>
        <SearchBar />
        <div className="category-chips">
          <span>Popular:</span>
          {POPULAR_SECTORS.map((sector) => (
            <Link className={`sector-${sector}`} key={sector} to={`/category/${sector}`}>
              <span />
              {SECTORS[sector].label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatRow({ stats }) {
  const items = [
    ['green', 'briefcase', stats.active, 'Active applications'],
    ['blue', 'calendar', stats.upcomingExams, 'Upcoming exams'],
    ['amber', 'clock', stats.closingWeek, 'Closing this week'],
    ['purple', 'trophy', stats.resultsMonth, 'Results this month'],
  ];
  return (
    <div className="container stat-row">
      {items.map(([tone, icon, value, label]) => (
        <div key={label}>
          <span className={`stat-icon ${tone}`}><Icon name={icon} /></span>
          <p>
            <strong>{value ?? '—'}</strong>
            <small>{label}</small>
          </p>
        </div>
      ))}
    </div>
  );
}

function SideUpdates({ updates, closing }) {
  return (
    <aside className="sidebar">
      <div className="side-card">
        <div className="side-card-title">
          <div>
            <span>LIVE UPDATES</span>
            <h3>Latest updates</h3>
          </div>
          <span className="live-dot" />
        </div>
        {updates.length ? updates.map((job) => (
          <Link className="update-row" key={job.id} to={jobPath(job)}>
            <span className={`mini-mark sector-${sectorOf(job)}`}>{orgMarkFor(job)}</span>
            <span>
              <Badge status={statusOf(job)} />
              <strong>{titleFor(job)}</strong>
              <small>
                {job.exam_date ? `Exam on ${displayDate(job.exam_date)}` : `Released ${timeAgo(job.published_at) || 'recently'}`}
              </small>
            </span>
            <Icon name="chevron" size={16} />
          </Link>
        )) : <p className="side-empty">No admit cards or results published yet.</p>}
        <Link className="side-view" to="/results">
          View all updates <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="side-card closing-card">
        <div className="side-card-title">
          <div>
            <span>DON'T MISS OUT</span>
            <h3>Closing soon</h3>
          </div>
          <Icon name="clock" />
        </div>
        {closing.length ? closing.map((job) => {
          const days = daysUntil(job.last_date);
          return (
            <Link className="deadline-row" key={job.id} to={jobPath(job)}>
              <span className={days <= 2 ? 'hot' : ''}>
                {days}
                <small>{days === 1 ? 'DAY' : 'DAYS'}</small>
              </span>
              <p>
                <strong>{titleFor(job)}</strong>
                <small>{vacanciesFor(job)} vacancies</small>
              </p>
              <Icon name="chevron" size={16} />
            </Link>
          );
        }) : <p className="side-empty">No application deadlines coming up.</p>}
      </div>
    </aside>
  );
}

export default function Home() {
  const [status, setStatus] = useState('All');
  const { data, loading, error, reload } = useRequest(async () => {
    const query = (category, limit) => getJobs({ category, limit, page: 1, sort: 'newest' });
    const [jobs, admits, results, keys] = await Promise.all([
      query('job', 100),
      query('admit_card', 20),
      query('result', 50),
      query('answer_key', 20),
    ]);
    return { jobs: jobs.data || [], admits: admits.data || [], results: results.data || [], keys: keys.data || [] };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const { jobs, admits, results, keys } = data;
    const all = [...jobs, ...admits, ...results, ...keys].sort(newestFirst);
    const open = jobs.filter(isOpen);
    const now = new Date();
    const counts = Object.fromEntries(
      HOME_SECTORS.map((sector) => {
        const inSector = jobs.filter((job) => sectorOf(job) === sector);
        return [sector, {
          active: inSector.filter(isOpen).length,
          upcoming: inSector.filter((job) => statusOf(job) === 'Upcoming').length,
        }];
      })
    );
    return {
      all,
      open,
      counts,
      upcoming: all.filter((job) => ['Upcoming', 'Admit Card'].includes(statusOf(job))),
      updates: [...admits, ...results, ...keys].sort(newestFirst).slice(0, 4),
      closing: jobs
        .filter((job) => (daysUntil(job.last_date) ?? -1) >= 0)
        .sort((a, b) => daysUntil(a.last_date) - daysUntil(b.last_date))
        .slice(0, 3),
      stats: {
        active: open.length,
        upcomingExams: jobs.filter((job) => (daysUntil(job.exam_date) ?? -1) >= 0).length,
        closingWeek: jobs.filter((job) => { const days = daysUntil(job.last_date); return days != null && days >= 0 && days <= 7; }).length,
        resultsMonth: results.filter((job) => {
          const published = parseDate(job.published_at);
          return published && published.getMonth() === now.getMonth() && published.getFullYear() === now.getFullYear();
        }).length,
      },
    };
  }, [data]);

  const listed = !view ? [] : status === 'All' ? view.open : view.all.filter((job) => statusOf(job) === status);

  return (
    <>
      <SEO
        title=""
        description="Government jobs and exams in one place: upcoming notifications, active forms, admit cards, results and exam dates from official sources."
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'GovTrack Jobs',
            url: SITE_URL,
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'GovTrack Jobs',
            url: SITE_URL,
            logo: `${SITE_URL}/favicon.svg`,
          },
        ]}
      />
      <SearchHero />
      <StatRow stats={view?.stats || {}} />
      {loading ? <PageSkeleton /> : error ? (
        <main className="container main-content"><ErrorState message={error} retry={reload} /></main>
      ) : (
        <main className="container main-content">
          <section className="sector-explore">
            <SectionHeading eyebrow="BROWSE CATEGORIES" title="Explore by sector" viewTo="/category/banking" />
            <div className="sector-grid">
              {HOME_SECTORS.map((sector) => <SectorCard key={sector} sector={sector} counts={view.counts[sector]} />)}
            </div>
          </section>
          <div className="filter-strip">
            <span>Filter by status</span>
            <div>
              {STATUSES.map((item) => (
                <button className={status === item ? 'active' : ''} key={item} onClick={() => setStatus(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="content-grid">
            <div>
              <SectionHeading
                eyebrow="APPLY NOW"
                title={status === 'All' ? 'Active applications' : `${status} updates`}
                count={listed.length}
                viewTo="/jobs"
              />
              <div className="job-list">
                {listed.length ? listed.slice(0, 4).map((job) => <JobCard key={job.id} job={job} />) : <EmptyState />}
              </div>
              <SectionHeading eyebrow="PLAN AHEAD" title="Upcoming notifications" count={view.upcoming.length} viewTo="/search" />
              {view.upcoming.length ? (
                <div className="compact-grid">
                  {view.upcoming.slice(0, 4).map((job) => <CompactCard key={job.id} job={job} />)}
                </div>
              ) : <EmptyState title="No upcoming notifications" description="New notifications will appear here as soon as they are published." />}
            </div>
            <SideUpdates updates={view.updates} closing={view.closing} />
          </div>
        </main>
      )}
    </>
  );
}
