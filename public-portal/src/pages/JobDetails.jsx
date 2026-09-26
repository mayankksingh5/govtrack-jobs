import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJob, SITE_URL } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Icon from '../components/Icon.jsx';
import SEO from '../components/SEO.jsx';
import { ErrorState, PageSkeleton } from '../components/States.jsx';
import { Badge, OrgMark, SectionHeading, SectorBadge } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import {
  applyLinkFor,
  daysUntil,
  displayDate,
  notificationLinkFor,
  officialLinkFor,
  parseDate,
  statusOf,
  timeAgo,
  vacanciesFor,
} from '../lib/jobs.js';
import { SECTORS, sectorOf } from '../lib/sectors.js';
import { organizationFor, titleFor } from '../utils.js';

const TABS = ['Overview', 'Important Dates', 'Vacancy', 'Eligibility', 'Fees', 'Selection', 'Exam Pattern', 'Syllabus', 'Documents', 'Official Links', 'Updates'];
const SEE_NOTIFICATION = 'Refer to the official notification';

function timelineFor(job) {
  const at = (type) => (job.type === type ? job.published_at : null);
  const steps = [
    { label: 'Notification released', date: job.type === 'job' ? job.published_at : null },
    { label: 'Application started', date: job.apply_start },
    { label: 'Application closing', date: job.last_date, key: 'close' },
    { label: 'Correction window', date: null },
    { label: 'Exam city information', date: null },
    { label: 'Admit card', date: at('admit_card') },
    { label: 'Preliminary exam', date: job.exam_date, key: 'exam' },
    { label: 'Answer key', date: at('answer_key') },
    { label: 'Result', date: at('result') },
    { label: 'Final result', date: null },
  ];
  const done = (step) => {
    const days = daysUntil(step.date);
    return days != null && (days < 0 || (days === 0 && !step.key));
  };
  const current = steps.findIndex((step) => step.date && !done(step));
  return steps.map((step, index) => ({
    ...step,
    state: !step.date ? 'pending' : done(step) ? 'complete' : index === current ? 'current' : 'upcoming',
  }));
}

const STATE_BADGE = { complete: 'Completed', upcoming: 'Upcoming', pending: 'TBA' };

function useCountdown(lastDate) {
  const compute = useCallback(() => {
    const end = parseDate(lastDate);
    if (!end) return null;
    end.setHours(23, 59, 59, 999);
    const ms = end - Date.now();
    if (ms < 0) return null;
    return {
      days: Math.floor(ms / 86_400_000),
      hours: Math.floor(ms / 3_600_000) % 24,
      mins: Math.floor(ms / 60_000) % 60,
    };
  }, [lastDate]);
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    setLeft(compute());
    const timer = window.setInterval(() => setLeft(compute()), 30_000);
    return () => window.clearInterval(timer);
  }, [compute]);
  return left;
}

function InfoList({ rows }) {
  return (
    <dl className="info-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || SEE_NOTIFICATION}</dd>
        </div>
      ))}
    </dl>
  );
}

function TabContent({ tab, job, title, notification }) {
  const links = (job.important_links || []).filter((link) => /^https?:\/\//i.test(link.url || ''));
  switch (tab) {
    case 'Overview':
      return <p>{job.short_info || `${organizationFor(job)} has published ${title}. Check the key dates, eligibility and official links before applying.`}</p>;
    case 'Important Dates':
      return <InfoList rows={[
        ['Notification', displayDate(job.published_at)],
        ['Application starts', displayDate(job.apply_start)],
        ['Last date to apply', displayDate(job.last_date)],
        ['Exam date', displayDate(job.exam_date)],
      ]} />;
    case 'Vacancy':
      return <InfoList rows={[['Total vacancies', job.total_vacancy != null && vacanciesFor(job)], ['Post name', job.post_name]]} />;
    case 'Eligibility':
      return <InfoList rows={[['Qualification', job.qualification], ['Age limit', job.age_limit]]} />;
    case 'Fees':
      return <InfoList rows={[['Application fee', job.fee_info]]} />;
    case 'Official Links':
      return links.length ? (
        <InfoList rows={links.map((link) => [link.label || 'Official link', (
          <a href={link.url} target="_blank" rel="noopener noreferrer">Open link <Icon name="external" size={13} /></a>
        )])} />
      ) : <p>No official links have been added for this update yet.</p>;
    case 'Updates':
      return <InfoList rows={[
        ['Published', displayDate(job.published_at)],
        ['Last updated', job.updated_at && `${displayDate(job.updated_at)} (${timeAgo(job.updated_at)})`],
        ['Source', job.source_name || 'Official website'],
      ]} />;
    default:
      return (
        <p>
          {tab} details are published in the official notification.{' '}
          {notification && <a className="text-link" href={notification} target="_blank" rel="noopener noreferrer">Open notification</a>}
        </p>
      );
  }
}

export default function JobDetails() {
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const loader = useCallback(async () => (await getJob(id)).data?.[0] || null, [id]);
  const { data: job, loading, error, reload } = useRequest(loader, [loader]);
  const left = useCountdown(job?.last_date);

  if (loading) return <PageSkeleton />;
  if (error || !job) {
    return <main className="detail-page"><div className="container"><ErrorState message={error || 'Job not found'} retry={reload} /></div></main>;
  }

  const title = titleFor(job);
  const organization = organizationFor(job);
  const sector = sectorOf(job);
  const status = statusOf(job);
  const notification = notificationLinkFor(job);
  const official = officialLinkFor(job);
  const apply = applyLinkFor(job) || official;
  const toClose = daysUntil(job.last_date);
  const canonicalPath = `/jobs/${job.id}`;
  const schema = job.type === 'job' ? {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: job.short_info || title,
    datePosted: job.published_at,
    validThrough: job.last_date || undefined,
    hiringOrganization: { '@type': 'Organization', name: organization },
    employmentType: 'FULL_TIME',
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'IN' } },
    ...(job.total_vacancy != null && { totalJobOpenings: job.total_vacancy }),
    url: `${SITE_URL}${canonicalPath}`,
  } : null;

  return (
    <main className="detail-page">
      <SEO
        title={title}
        description={job.short_info || `${title} by ${organization}. Check dates, qualification, vacancies and official links.`}
        path={canonicalPath}
        type="article"
        schema={schema}
      />
      <div className="container">
        <Breadcrumbs items={[{ label: SECTORS[sector].label, to: `/category/${sector}` }, { label: title }]} />
        <section className={`detail-header sector-context sector-${sector}`}>
          <div className="detail-title-wrap">
            <OrgMark job={job} sector={sector} large />
            <div>
              <div className="title-meta">
                <Badge status={status} />
                <SectorBadge sector={sector} />
              </div>
              <h1>{title}</h1>
              <p><Link to={`/organization/${encodeURIComponent(organization)}`}>{organization}</Link></p>
            </div>
          </div>
          <div className="detail-actions">
            {apply && (
              <a className="button primary" href={apply} target="_blank" rel="noopener noreferrer">
                Apply on official site <Icon name="external" size={16} />
              </a>
            )}
          </div>
          <div className="verification-banner">
            <Icon name="verified" />
            <p>
              <strong>Sourced from {job.source_name || 'the official website'}</strong>
              <small>
                Last updated {displayDate(job.updated_at || job.published_at, 'recently')}
                {job.post_name && ` • ${job.post_name}`}
              </small>
            </p>
            {notification && (
              <a href={notification} target="_blank" rel="noopener noreferrer">
                View official notice <Icon name="external" size={14} />
              </a>
            )}
          </div>
        </section>
        <div className="detail-layout">
          <div>
            <section className="key-facts">
              <div>
                <span>VACANCIES</span>
                <strong>{vacanciesFor(job)}</strong>
                <small>As per notification</small>
              </div>
              <div>
                <span>LAST DATE</span>
                <strong>{displayDate(job.last_date, 'To be announced')}</strong>
                <small className={toClose != null && toClose >= 0 && toClose <= 7 ? 'urgent' : ''}>
                  {toClose == null ? 'Check notification' : toClose < 0 ? 'Applications closed' : toClose === 0 ? 'Closes today' : `${toClose} days remaining`}
                </small>
              </div>
              <div>
                <span>QUALIFICATION</span>
                <strong>{job.qualification || 'See notification'}</strong>
                <small>Check full eligibility</small>
              </div>
              <div>
                <span>AGE LIMIT</span>
                <strong>{job.age_limit || 'See notification'}</strong>
                <small>Relaxation as per rules</small>
              </div>
            </section>
            <section className={`timeline-card sector-timeline sector-${sector}`}>
              <SectionHeading eyebrow="RECRUITMENT JOURNEY" title="Important timeline" />
              <div className="timeline">
                {timelineFor(job).map((step, index) => (
                  <div className={`timeline-item ${step.state}`} key={step.label}>
                    <span className="timeline-dot">{step.state === 'complete' ? '✓' : index + 1}</span>
                    <p>
                      <strong>{step.label}</strong>
                      <small>{displayDate(step.date, 'To be announced')}</small>
                    </p>
                    <Badge status={step.state === 'current' ? (step.key === 'close' ? status : 'Upcoming') : STATE_BADGE[step.state]} />
                    {(notification || official) && (
                      <a href={notification || official} target="_blank" rel="noopener noreferrer" aria-label={`Official source for ${step.label}`}>
                        <Icon name="external" size={15} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="info-card">
              <div className="info-tabs">
                {TABS.map((name) => (
                  <button className={tab === name ? 'active' : ''} onClick={() => setTab(name)} key={name}>{name}</button>
                ))}
              </div>
              <div className="info-content">
                <span>{tab.toUpperCase()}</span>
                <h2>{tab === 'Overview' ? `About ${title}` : tab}</h2>
                <TabContent tab={tab} job={job} title={title} notification={notification} />
                <div className="notice">
                  <Icon name="verified" />
                  <p>
                    <strong>Always verify before applying</strong>
                    <small>Dates and requirements are summarized from the official notification. GovTrack Jobs does not conduct this recruitment.</small>
                  </p>
                </div>
              </div>
            </section>
          </div>
          <aside className="sidebar detail-side">
            <div className="side-card apply-card">
              <span>APPLICATION STATUS</span>
              <Badge status={status} />
              {left ? (
                <>
                  <h3>Applications close in</h3>
                  <div className="countdown">
                    <span><strong>{String(left.days).padStart(2, '0')}</strong><small>DAYS</small></span>
                    <span><strong>{String(left.hours).padStart(2, '0')}</strong><small>HOURS</small></span>
                    <span><strong>{String(left.mins).padStart(2, '0')}</strong><small>MINS</small></span>
                  </div>
                </>
              ) : (
                <h3>{job.last_date ? 'Applications are closed' : 'Last date to be announced'}</h3>
              )}
              {apply ? (
                <a className="button primary" href={apply} target="_blank" rel="noopener noreferrer">
                  Apply now <Icon name="external" size={16} />
                </a>
              ) : <button className="button primary" disabled>Apply link not available</button>}
              <small>Opens official {organization} website</small>
            </div>
            <div className="side-card official-links">
              <div className="side-card-title">
                <div>
                  <span>QUICK ACCESS</span>
                  <h3>Official links</h3>
                </div>
              </div>
              {(job.important_links || []).filter((link) => /^https?:\/\//i.test(link.url || '')).map((link) => (
                <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                  <Icon name={/pdf|notification/i.test(link.label || '') ? 'file' : 'external'} size={16} />
                  {link.label || 'Official link'}
                  <Icon name="arrow" size={15} />
                </a>
              ))}
              {!(job.important_links || []).length && <p>No official links added yet.</p>}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
