import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';

export default function Organization() {
  const { name } = useParams();
  const organization = decodeURIComponent(name);
  const [page, setPage] = useState(1);
  const loader = useCallback(() => getJobs({ organization, page, limit: 10, sort: 'newest' }), [organization, page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  return (
    <main className="listing-page">
      <SEO
        title={`${organization} Jobs`}
        description={`Latest government recruitment updates from ${organization}.`}
        path={`/organization/${encodeURIComponent(organization)}`}
      />
      <div className="container">
        <Breadcrumbs items={[{ label: organization }]} />
        <div className="listing-title">
          <div>
            <span>ORGANIZATION</span>
            <h1>{organization}</h1>
            <p>Latest published recruitment updates · {data?.total ?? '—'} total</p>
          </div>
        </div>
        <div className="job-list">
          {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : data.data.length ? (
            data.data.map((job) => <JobCard key={job.id} job={job} />)
          ) : <EmptyState title="No current openings" description={`No published updates were found for ${organization}.`} />}
        </div>
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </main>
  );
}
