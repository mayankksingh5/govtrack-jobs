import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Icon from '../components/Icon.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { Badge, SectionHeading } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { applyFilterBar, organizationsIn } from '../lib/filters.js';
import { displayDate, orgMarkFor, parseDate, statusOf } from '../lib/jobs.js';
import { sectorOf } from '../lib/sectors.js';
import { organizationFor, titleFor } from '../utils.js';

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key, style = 'long') => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: style, year: 'numeric' });
};

/* The current month and the five after it. */
function nextMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => monthKey(new Date(now.getFullYear(), now.getMonth() + index, 1)));
}

/* Minimal iCalendar export of the exams shown, for "Add to calendar". */
function downloadIcs(rows) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const escape = (text) => String(text).replace(/[\\;,]/g, (match) => `\\${match}`);
  const events = rows.map((job) => {
    const day = job.exam_date.replaceAll('-', '');
    return [
      'BEGIN:VEVENT',
      `UID:govtrack-exam-${job.id}@govtrack`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${escape(titleFor(job))}`,
      `DESCRIPTION:${escape(organizationFor(job))}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GovTrack Jobs//Exam Calendar//EN', ...events, 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'govtrack-exam-calendar.ics' });
  link.click();
  URL.revokeObjectURL(url);
}

export default function Calendar() {
  const [params, setParams] = useSearchParams();
  const months = useMemo(nextMonths, []);
  const q = params.get('q') || '';
  const sector = params.get('sector') || '';
  const org = params.get('org') || '';

  const { data, loading, error, reload } = useRequest(
    async () => (await getJobs({ limit: 100, page: 1, sort: 'newest' })).data || [],
    []
  );

  const scheduled = useMemo(
    () => applyFilterBar((data || []).filter((job) => parseDate(job.exam_date)), { q, sector, org }),
    [data, q, sector, org]
  );
  const countFor = (key) => scheduled.filter((job) => monthKey(parseDate(job.exam_date)) === key).length;
  // Without an explicit month, open the first month that has exams.
  const month = months.includes(params.get('month'))
    ? params.get('month')
    : months.find((key) => countFor(key) > 0) || months[0];
  const filters = { q, sector, org, month };
  const rows = scheduled
    .filter((job) => monthKey(parseDate(job.exam_date)) === month)
    .sort((a, b) => parseDate(a.exam_date) - parseDate(b.exam_date));

  const apply = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  const monthLink = (key) => {
    const next = new URLSearchParams(params);
    next.set('month', key);
    return `?${next}`;
  };

  return (
    <main className="listing-page">
      <SEO title="Government Exam Calendar" description="Upcoming government exam dates and application windows in one calendar." path="/exam-calendar" />
      <div className="container">
        <Breadcrumbs items={[{ label: 'Exam Calendar' }]} />
        <div className="listing-title">
          <div>
            <span>STAY PREPARED</span>
            <h1>Government Exam Calendar</h1>
            <p>Application windows and exam dates, organized in one verified view.</p>
          </div>
          <button className="button secondary" disabled={!rows.length} onClick={() => downloadIcs(rows)}>
            <Icon name="calendar" size={17} /> Add to calendar
          </button>
        </div>
        <FilterBar
          value={filters}
          onApply={apply}
          organizations={organizationsIn((data || []).filter((job) => job.exam_date))}
          months={months.map((key) => [key, monthLabel(key)])}
        />
        {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : (
          <div className="calendar-layout">
            <aside className="month-nav">
              <span>{months[0].slice(0, 4)}</span>
              {months.map((key) => (
                <Link className={key === month ? 'active' : ''} key={key} to={monthLink(key)}>
                  {monthLabel(key, 'long').split(' ')[0]}
                  <small>{countFor(key)}</small>
                </Link>
              ))}
            </aside>
            <section className="calendar-list">
              <SectionHeading eyebrow={`${rows.length} ${rows.length === 1 ? 'EXAM' : 'EXAMS'} SCHEDULED`} title={monthLabel(month)} />
              {rows.length ? rows.map((job) => {
                const date = parseDate(job.exam_date);
                const sector = sectorOf(job);
                return (
                  <Link className="calendar-list-row" key={job.id} to={`/jobs/${job.id}`}>
                    <span className="date-block">
                      <strong>{date.getDate()}</strong>
                      <small>{date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</small>
                    </span>
                    <span className={`mini-mark sector-${sector}`}>{orgMarkFor(job)}</span>
                    <span className="cal-main">
                      <Badge status={statusOf(job)} />
                      <strong>{titleFor(job)}</strong>
                      <small>{organizationFor(job)}</small>
                    </span>
                    <span className="cal-app">
                      <small>APPLICATION PERIOD</small>
                      <strong>{displayDate(job.apply_start, 'TBA')} — {displayDate(job.last_date, 'TBA')}</strong>
                    </span>
                    <Icon name="chevron" size={18} />
                  </Link>
                );
              }) : <EmptyState title="No exams scheduled this month" description="Pick another month or clear the filters." />}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
