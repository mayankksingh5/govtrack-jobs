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
  const loader = useCallback(() => getJobs({ organization, page, limit: 18, sort: 'newest' }), [organization, page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  return (
    <>
      <SEO title={`${organization} Jobs`} description={`Latest published government opportunities from ${organization}.`} path={`/organization/${encodeURIComponent(organization)}`} />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: 'Organizations' }, { label: organization }]} />
        <div className="rounded-3xl bg-[#efe9dc] px-6 py-10 sm:px-10"><p className="eyebrow">ORGANIZATION</p><h1 className="mt-3 font-serif text-4xl font-semibold">{organization}</h1><p className="mt-3 text-[#667771]">Latest published records · {data?.total ?? '—'} total openings</p></div>
        <div className="mt-8">{loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : !data.data.length ? <EmptyState title="No current openings" description={`No published jobs were found for ${organization}.`} /> : <div className="grid gap-4 lg:grid-cols-3">{data.data.map((job) => <JobCard key={job.id} job={job} />)}</div>}</div>
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </>
  );
}
