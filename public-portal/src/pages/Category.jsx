import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ExamCalendarMini from '../components/ExamCalendarMini.jsx';
import Icon from '../components/Icon.jsx';
import JobCard, { CompactCard } from '../components/JobCard.jsx';
import SEO, { breadcrumbSchema, itemListSchema } from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { SectionHeading, SectorFilter } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { organizationsIn } from '../lib/filters.js';
import { isOpen, statusOf } from '../lib/jobs.js';
import { isSector, SECTORS, sectorOf } from '../lib/sectors.js';
import { organizationFor } from '../utils.js';
import NotFound from './NotFound.jsx';

const TABS = {
  All: () => true,
  Upcoming: (job) => statusOf(job) === 'Upcoming',
  'Active Forms': isOpen,
  'Admit Cards': (job) => job.type === 'admit_card',
  'Answer Keys': (job) => job.type === 'answer_key',
  Results: (job) => job.type === 'result',
  'Cut Off': () => false,
};

const TOOLKIT = [
  ['Latest cut-offs', '/cut-off'],
  ['Syllabus library', '/syllabus'],
  ['Exam patterns', '/syllabus'],
  ['Previous year papers', '/syllabus'],
];

export default function Category() {
  const { slug } = useParams();
  const [tab, setTab] = useState('All');
  const [org, setOrg] = useState('');
  useEffect(() => {
    setTab('All');
    setOrg('');
  }, [slug]);
  const { data, loading, error, reload } = useRequest(
    async () => (await getJobs({ limit: 100, page: 1, sort: 'newest' })).data || [],
    []
  );

  const records = useMemo(() => (data || []).filter((job) => sectorOf(job) === slug), [data, slug]);
  if (!isSector(slug)) return <NotFound />;

  const meta = SECTORS[slug];
  const inOrg = records.filter((job) => !org || organizationFor(job) === org);
  const filtered = inOrg.filter(TABS[tab]);
  const open = inOrg.filter(isOpen);
  const upcoming = inOrg.filter((job) => statusOf(job) === 'Upcoming');
  const calendarPath = `/exam-calendar?sector=${slug}`;

  return (
    <main className={`sector-context sector-${slug}`}>
      <SEO
        title={`${meta.label} Jobs & Exams ${new Date().getFullYear()}`}
        description={`${meta.label} government jobs ${new Date().getFullYear()}: active application forms, upcoming notifications, admit cards and results from official sources.`}
        path={`/category/${slug}`}
        schema={[
          breadcrumbSchema([{ name: meta.label, path: `/category/${slug}` }]),
          itemListSchema(`${meta.label} Jobs & Exams`, records),
        ]}
      />
      <section className="page-hero sector-header">
        <div className="container">
          <Breadcrumbs items={[{ label: meta.label }]} />
          <div className="page-title-row">
            <div className={`category-emblem sector-${slug}`}>
              <Icon name={meta.icon} size={29} />
            </div>
            <div>
              <span>{meta.label.toUpperCase()} SECTOR</span>
              <h1>{meta.label} Jobs &amp; Exams</h1>
              <p>{meta.description}. Verified recruitment updates from official sources.</p>
            </div>
          </div>
          <SectorFilter selected={slug} />
          <div className="page-tabs">
            {Object.keys(TABS).map((name) => (
              <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
                {name}
              </button>
            ))}
            <Link to={calendarPath} className="tab-link">Exam Calendar</Link>
          </div>
        </div>
      </section>
      {loading ? <PageSkeleton /> : error ? (
        <div className="container category-content"><ErrorState message={error} retry={reload} /></div>
      ) : (
        <div className="container category-content">
          <div className="org-filter">
            <span>Organization</span>
            <div>
              <button className={!org ? 'active' : ''} onClick={() => setOrg('')}>All organizations</button>
              {organizationsIn(records).map((name) => (
                <button key={name} className={org === name ? 'active' : ''} onClick={() => setOrg(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="content-grid">
            <div>
              {tab === 'All' ? (
                <>
                  <SectionHeading eyebrow="CURRENTLY OPEN" title={`${meta.label} application forms`} count={open.length} />
                  <div className="job-list">
                    {open.length ? open.map((job) => <JobCard job={job} key={job.id} />) : (
                      <EmptyState title={`No open ${meta.label} forms right now`} description="Check upcoming notifications below or come back soon." />
                    )}
                  </div>
                  <SectionHeading eyebrow="COMING UP" title={`Upcoming ${meta.label.toLowerCase()} notifications`} count={upcoming.length} />
                  {upcoming.length ? (
                    <div className="compact-grid">
                      {upcoming.map((job) => <CompactCard job={job} key={job.id} />)}
                    </div>
                  ) : <EmptyState title="No upcoming notifications" description="New notifications will appear here as soon as they are published." />}
                </>
              ) : (
                <>
                  <SectionHeading eyebrow={meta.label.toUpperCase()} title={tab} count={filtered.length} />
                  <div className="job-list">
                    {filtered.length ? filtered.map((job) => <JobCard job={job} key={job.id} />) : <EmptyState />}
                  </div>
                </>
              )}
            </div>
            <aside className="sidebar">
              <ExamCalendarMini jobs={records} calendarPath={calendarPath} />
              <div className="side-card quick-links">
                <div className="side-card-title">
                  <div>
                    <span>RESOURCES</span>
                    <h3>{meta.label} exam toolkit</h3>
                  </div>
                </div>
                {TOOLKIT.map(([label, to]) => (
                  <Link key={label} to={to}>
                    {label}
                    <Icon name="arrow" size={15} />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
