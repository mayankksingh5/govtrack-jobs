import { getJobs, getRecommendationAnalytics, getStatistics } from '../api.js';
import { ChartCard } from '../components/Charts.jsx';
import { Card, ErrorState, MetricCard, PageHeader, Skeleton } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';
import { groupCount } from '../utils.js';

export default function Statistics() {
  const { data, loading, error, reload } = useApi(async () => {
    const [statistics, jobs, analytics] = await Promise.all([
      getStatistics(),
      getJobs({ page: 1, limit: 100, sort: 'newest' }),
      getRecommendationAnalytics().catch(() => ({ data: [] })),
    ]);
    return { statistics: statistics.data?.[0] || {}, jobs: jobs.data || [], analytics: analytics.data?.[0] || {} };
  }, []);

  if (loading) return <Skeleton rows={8} />;
  if (error) return <ErrorState message={error} retry={reload} />;

  const jobs = data.jobs;
  const stats = data.statistics;
  const organizations = new Set(jobs.map((job) => job.organization || job.source_name).filter(Boolean));
  const monthly = groupCount(jobs, (job) => job.published_at?.slice(0, 7)).slice(0, 12).reverse();
  const analytics = data.analytics;

  return (
    <>
      <PageHeader title="Statistics" description="Published job analytics available through the REST API." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Jobs" value={stats.published_jobs ?? 0} tone="green" />
        <MetricCard label="Organizations" value={organizations.size} detail="Latest 100 jobs" />
        <MetricCard label="Categories" value={Object.keys(stats.by_category || {}).length} />
        <MetricCard label="PDFs Parsed" value="—" detail="Not exposed by API" />
        <MetricCard label="Average Response Time" value="—" detail="Not exposed by API" />
      </section>
      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Monthly Jobs" subtitle="Latest 100 published jobs" labels={monthly.map(([key]) => key)} values={monthly.map(([, value]) => value)} type="line" />
        <ChartCard title="Source Success Rate" subtitle="Requires source-health API data" labels={[]} values={[]} type="doughnut" />
        <ChartCard title="Duplicate Rate" subtitle="Requires duplicate-log API data" labels={[]} values={[]} type="doughnut" />
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {[
          ['Most Viewed Jobs', analytics.most_viewed_jobs],
          ['Most Saved Jobs', analytics.most_saved_jobs],
          ['Top Categories', analytics.top_categories],
          ['Top Organizations', analytics.top_organizations],
        ].map(([title, rows]) => (
          <Card key={title}>
            <h3 className="font-semibold">{title}</h3>
            {rows?.length ? (
              <ol className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
                {rows.map((row) => <li key={row.label} className="flex justify-between gap-4 py-3 text-sm"><span>{row.label}</span><strong>{row.count}</strong></li>)}
              </ol>
            ) : <p className="mt-4 text-sm text-slate-500">No recommendation interaction data available.</p>}
          </Card>
        ))}
      </section>
    </>
  );
}
