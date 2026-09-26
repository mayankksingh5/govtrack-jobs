import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  displayDate,
  notificationLinkFor,
  officialLinkFor,
  orgMarkFor,
  statusOf,
  timeAgo,
  vacanciesFor,
} from '../lib/jobs.js';
import { sectorOf } from '../lib/sectors.js';
import { organizationFor, titleFor } from '../utils.js';
import Icon from './Icon.jsx';
import { Badge, BookmarkButton, OrgMark, SectorBadge, ViewDetailsButton } from './UI.jsx';

function JobCard({ job }) {
  const sector = sectorOf(job);
  const status = statusOf(job);
  const official = officialLinkFor(job);
  const notification = notificationLinkFor(job);
  const detailPath = `/jobs/${job.id}`;
  return (
    <article className={`job-card sector-accent sector-${sector}`}>
      <div className="job-card-top">
        <OrgMark job={job} sector={sector} />
        <div className="job-title">
          <div className="title-meta">
            <Badge status={status} />
            <SectorBadge sector={sector} />
          </div>
          <h3><Link to={detailPath}>{titleFor(job)}</Link></h3>
          <p>{organizationFor(job)}</p>
        </div>
        <BookmarkButton jobId={job.id} />
      </div>
      <div className="job-facts">
        <div>
          <span>VACANCIES</span>
          <strong>{vacanciesFor(job)}</strong>
        </div>
        <div>
          <span>QUALIFICATION</span>
          <strong>{job.qualification || 'See notification'}</strong>
        </div>
        <div>
          <span>LAST DATE</span>
          <strong className={status === 'Closing Soon' ? 'urgent' : ''}>
            {displayDate(job.last_date, 'To be announced')}
          </strong>
        </div>
        <div>
          <span>EXAM DATE</span>
          <strong>{displayDate(job.exam_date, 'Notified later')}</strong>
        </div>
      </div>
      <div className="job-source">
        <Icon name="verified" size={15} /> Source: {job.source_name || 'Official website'}
        {job.updated_at && <><span>•</span> Last updated {timeAgo(job.updated_at)}</>}
      </div>
      <div className="card-actions">
        <ViewDetailsButton category={sector} to={detailPath} />
        {official && (
          <a className="button text" href={official} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={15} /> Official website
          </a>
        )}
        {notification && (
          <a className="button text" href={notification} target="_blank" rel="noopener noreferrer">
            <Icon name="file" size={15} /> Notification PDF
          </a>
        )}
      </div>
    </article>
  );
}

export function CompactCard({ job }) {
  const sector = sectorOf(job);
  const status = statusOf(job);
  const note = status === 'Upcoming'
    ? `Expected: ${displayDate(job.apply_start, 'To be announced')}`
    : `Posted ${timeAgo(job.published_at) || 'recently'}`;
  return (
    <Link className={`compact-card sector-accent sector-${sector}`} to={`/jobs/${job.id}`}>
      <span className={`mini-mark sector-${sector}`}>{orgMarkFor(job)}</span>
      <span>
        <Badge status={status} />
        <SectorBadge sector={sector} />
        <strong>{titleFor(job)}</strong>
        <small>{organizationFor(job)}</small>
        <em>{note}</em>
      </span>
      <Icon name="chevron" size={17} />
    </Link>
  );
}

export default memo(JobCard);
