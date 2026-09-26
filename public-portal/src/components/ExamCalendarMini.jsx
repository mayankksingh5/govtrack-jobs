import { Link } from 'react-router-dom';
import { daysUntil, MONTHS_SHORT, parseDate } from '../lib/jobs.js';
import { titleFor } from '../utils.js';
import Icon from './Icon.jsx';
import { jobPath } from '../lib/slug.js';

const monthShort = (date) => MONTHS_SHORT[date.getMonth()].toUpperCase();

/* Sidebar card listing the next three exam dates from the given records. */
export default function ExamCalendarMini({ jobs, calendarPath = '/exam-calendar' }) {
  const upcoming = jobs
    .filter((job) => (daysUntil(job.exam_date) ?? -1) >= 0)
    .sort((a, b) => daysUntil(a.exam_date) - daysUntil(b.exam_date))
    .slice(0, 3);
  const first = upcoming.length ? parseDate(upcoming[0].exam_date) : new Date();
  const heading = `${first.toLocaleDateString('en-IN', { month: 'long' })} ${first.getFullYear()}`.toUpperCase();
  return (
    <div className="side-card calendar-mini">
      <div className="side-card-title">
        <div>
          <span>{heading}</span>
          <h3>Exam calendar</h3>
        </div>
        <Link className="calendar-link" to={calendarPath} aria-label="Open exam calendar">
          <Icon name="calendar" />
        </Link>
      </div>
      {upcoming.length ? upcoming.map((job) => {
        const date = parseDate(job.exam_date);
        return (
          <Link className="calendar-event" key={job.id} to={jobPath(job)}>
            <span>
              {String(date.getDate()).padStart(2, '0')}
              <small>{monthShort(date)}</small>
            </span>
            <p>
              <strong>{titleFor(job)}</strong>
              <small>{date.toLocaleDateString('en-IN', { weekday: 'long' })}</small>
            </p>
          </Link>
        );
      }) : <p className="side-empty">No exam dates announced yet.</p>}
      <Link className="side-view" to={calendarPath}>
        Full exam calendar <Icon name="arrow" size={16} />
      </Link>
    </div>
  );
}
