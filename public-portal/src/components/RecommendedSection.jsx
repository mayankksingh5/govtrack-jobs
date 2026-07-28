import { useCallback } from 'react';
import { getRecommendations } from '../api.js';
import { useRequest } from '../hooks/useRequest.js';
import JobCard from './JobCard.jsx';
import { EmptyState } from './States.jsx';

export default function RecommendedSection({ limit = 6 }) {
  const loader = useCallback(() => getRecommendations({ limit, page: 1 }), [limit]);
  const { data, loading, error } = useRequest(loader, [loader]);
  return (
    <section className="section">
      <div className="section-heading">
        <div><h2>Recommended for You</h2><p>Explainable matches based on your preferences and activity</p></div>
      </div>
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-60 animate-pulse rounded-2xl bg-[#123d31]/8" />)}</div>
      ) : error ? (
        <EmptyState title="Recommendations unavailable" description="Set up the recommendation schema and service key to enable personalized jobs." />
      ) : data?.data?.length ? (
        <div className="grid gap-4 lg:grid-cols-3">{data.data.map((job) => <JobCard key={job.id} job={job} />)}</div>
      ) : (
        <EmptyState title="No recommendations yet" description="Add preferences in For You to improve your matches." />
      )}
    </section>
  );
}
