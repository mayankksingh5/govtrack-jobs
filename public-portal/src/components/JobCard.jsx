import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, organizationFor, titleFor } from '../utils.js';

function JobCard({ job, view = 'grid' }) {
  return (
    <article className={`job-card ${view === 'list' ? 'sm:flex sm:items-center sm:justify-between sm:gap-6' : ''}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{job.type?.replaceAll('_', ' ') || 'Job'}</span>
          {job.total_vacancy != null && <span className="text-xs text-[#687872]">{job.total_vacancy} vacancies</span>}
        </div>
        <h3 className="mt-4 font-serif text-xl font-semibold leading-snug"><Link className="hover:text-[#b4522b]" to={`/jobs/${job.id}`}>{titleFor(job)}</Link></h3>
        <p className="mt-2 text-sm font-medium text-[#52645f]">{organizationFor(job)}</p>
      </div>
      <div className={`${view === 'list' ? 'mt-4 shrink-0 sm:mt-0 sm:text-right' : 'mt-6 flex items-end justify-between'}`}>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#82908b]">Last date</p><p className="mt-1 text-sm font-semibold">{formatDate(job.last_date)}</p></div>
        <Link to={`/jobs/${job.id}`} className="ml-5 text-sm font-bold text-[#b4522b]">View details →</Link>
      </div>
    </article>
  );
}

export default memo(JobCard);
