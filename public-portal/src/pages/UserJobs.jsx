import { useCallback, useState } from 'react';
import { getUserJobs, removeSavedJob } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';

export default function UserJobs({ kind = 'saved' }) {
  const [page, setPage] = useState(1);
  const loader = useCallback(() => getUserJobs(kind, { page, limit: 18 }), [kind, page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  const labels = { saved: 'Saved Jobs', recent: 'Recently Viewed Jobs', applied: 'Applied Jobs' };
  const remove = async (id) => { await removeSavedJob(id); reload(); };
  return (
    <>
      <SEO title={labels[kind]} description={`View your ${labels[kind].toLowerCase()}.`} path={`/${kind === 'recent' ? 'recently-viewed' : `${kind}-jobs`}`} />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: labels[kind] }]} />
        <div className="page-heading"><h1>{labels[kind]}</h1><p>Private activity associated with your account.</p></div>
        <div className="mt-8">{loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : !data.data.length ? <EmptyState title={`No ${labels[kind].toLowerCase()}`} description="Jobs will appear here as you use the portal." /> : <div className="grid gap-4 lg:grid-cols-3">{data.data.map((job) => <div key={job.id}><JobCard job={job} />{kind === 'saved' && <button className="button-secondary mt-2 w-full" onClick={() => remove(job.id)}>Remove saved job</button>}</div>)}</div>}</div>
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </>
  );
}
