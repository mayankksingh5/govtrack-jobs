import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { recordJobActivity } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { orgMarkFor } from '../lib/jobs.js';
import { POPULAR_SECTORS, SECTORS } from '../lib/sectors.js';
import Icon from './Icon.jsx';

export function Badge({ status }) {
  return <span className={`badge badge-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

export function SectorIcon({ sector, size = 18 }) {
  return (
    <span className={`sector-icon sector-${sector}`} aria-hidden="true">
      <Icon name={SECTORS[sector].icon} size={size} />
    </span>
  );
}

export function SectorBadge({ sector }) {
  return (
    <span className={`sector-badge sector-${sector}`}>
      <Icon name={SECTORS[sector].icon} size={12} />
      {SECTORS[sector].label}
    </span>
  );
}

export function OrgMark({ job, sector, large = false }) {
  return <div className={`org-mark ${large ? 'large' : ''} sector-${sector}`}>{orgMarkFor(job)}</div>;
}

export function SectorCard({ sector, counts }) {
  const meta = SECTORS[sector];
  return (
    <Link className={`sector-card sector-${sector}`} to={`/category/${sector}`}>
      <SectorIcon sector={sector} size={22} />
      <span className="sector-card-copy">
        <strong>{meta.label}</strong>
        <small>{meta.description}</small>
      </span>
      <span className="sector-counts">
        <strong>{counts?.active ?? 0}</strong> active
        <i />
        <strong>{counts?.upcoming ?? 0}</strong> upcoming
      </span>
      <Icon name="arrow" size={17} />
    </Link>
  );
}

export function SectorFilter({ selected }) {
  return (
    <div className="sector-filter" aria-label="Filter by sector">
      {POPULAR_SECTORS.map((sector) => (
        <Link
          className={`sector-${sector} ${selected === sector ? 'selected' : ''}`}
          key={sector}
          to={`/category/${sector}`}
          aria-current={selected === sector ? 'page' : undefined}
        >
          <SectorIcon sector={sector} size={14} />
          {SECTORS[sector].label}
        </Link>
      ))}
    </div>
  );
}

/* The call-to-action always takes the recruitment's sector colour. */
export function ViewDetailsButton({ category, to }) {
  return (
    <Link className={`button sector-view-details sector-${category}`} to={to}>
      View details <Icon name="arrow" size={16} />
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, count, viewTo }) {
  return (
    <div className="section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>
          {title} {count > 0 && <small>{count}</small>}
        </h2>
      </div>
      {viewTo && (
        <Link to={viewTo}>
          View all <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}

/* Bookmark / Save control. Saving needs an account, so guests go to login. */
export function useSaveJob(jobId) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    try {
      await recordJobActivity(jobId, 'saved');
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };
  return { saved, save };
}

export function BookmarkButton({ jobId }) {
  const { saved, save } = useSaveJob(jobId);
  return (
    <button className={`bookmark ${saved ? 'saved' : ''}`} aria-label={saved ? 'Job saved' : 'Save job'} onClick={save}>
      <Icon name="bookmark" size={18} />
    </button>
  );
}
