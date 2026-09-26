import { useCallback, useState } from 'react';
import { getUserJobs, removeSavedJob } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';

const LABELS = { saved: 'Saved Jobs', recent: 'Recently Viewed Jobs', applied: 'Applied Jobs' };

export default function UserJobs({ kind = 'saved' }) {
  const [page, setPage] = useState(1);
  const loader = useCallback(() => getUserJobs(kind, { page, limit: 10 }), [kind, page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  const remove = async (id) => { await removeSavedJob(id); reload(); };
  return (
    <main className="listing-page">
      <SEO title={LABELS[kind]} description={`View your ${LABELS[kind].toLowerCase()}.`} path={`/${kind === 'recent' ? 'recently-viewed' : `${kind}-jobs`}`} />
      <div className="container">
        <Breadcrumbs items={[{ label: 'Profile', to: '/profile' }, { label: LABELS[kind] }]} />
        <div className="listing-title">
          <div>
            <span>YOUR ACTIVITY</span>
            <h1>{LABELS[kind]}</h1>
            <p>Private activity associated with your account.</p>
          </div>
        </div>
        <div className="job-list">
          {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : data.data.length ? (
            data.data.map((job) => (
              <div key={job.id} className="job-list">
                <JobCard job={job} />
                {kind === 'saved' && <button className="button secondary" onClick={() => remove(job.id)}>Remove saved job</button>}
              </div>
            ))
          ) : <EmptyState title={`No ${LABELS[kind].toLowerCase()} yet`} description="Jobs will appear here as you use GovTrack." />}
        </div>
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </main>
  );
}
