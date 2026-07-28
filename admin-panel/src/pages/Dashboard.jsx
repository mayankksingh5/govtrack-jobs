import { getJobs, getStatistics } from '../api.js';
import { ChartCard } from '../components/Charts.jsx';
import { ErrorState, MetricCard, PageHeader, Skeleton } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';
import { groupCount } from '../utils.js';

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(async () => {
    const [statistics, jobs] = await Promise.all([
      getStatistics(),
      getJobs({ page: 1, limit: 100, sort: 'newest' }),
    ]);
    return { statistics: statistics.data?.[0] || {}, jobs: jobs.data || [] };
  }, []);

  if (loading) return <Skeleton rows={8} />;
  if (error) return <ErrorState message={error} retry={reload} />;

  const jobs = data.jobs;
  const stats = data.statistics;
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const todayJobs = jobs.filter((job) => new Date(job.published_at) >= dayStart).length;
  const weekJobs = jobs.filter((job) => new Date(job.published_at) >= weekStart).length;
  const perDay = groupCount(jobs, (job) => job.published_at?.slice(0, 10)).slice(0, 10).reverse();
  const organizations = groupCount(jobs, (job) => job.organization || job.source_name).slice(0, 8);
  const categories = Object.entries(stats.by_category || {});

  return (
    <>
      <PageHeader
        title="Operations overview"
        description="Published-job metrics from the existing REST API. Recent calculations use the latest 100 jobs."
        action={<button onClick={reload} className="button">Refresh data</button>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Jobs" value={stats.published_jobs ?? 0} tone="green" />
        <MetricCard label="Today's Jobs" value={todayJobs} detail="Latest 100 published jobs" />
        <MetricCard label="Jobs This Week" value={weekJobs} detail="Latest 100 published jobs" />
        <MetricCard label="Active Sources" value="—" detail="Source API endpoint unavailable" />
        <MetricCard label="Warning Sources" value="—" detail="Source API endpoint unavailable" tone="amber" />
        <MetricCard label="Failed Sources" value="—" detail="Source API endpoint unavailable" tone="red" />
        <MetricCard label="PDFs Parsed" value="—" detail="Parser logs are not exposed by the API" />
        <MetricCard label="Duplicate Jobs Skipped" value="—" detail="Duplicate logs are not exposed by the API" />
        <MetricCard
          label="Last Scrape Time"
          value="—"
          detail="Scrape-run metadata is not exposed by the API"
        />
      </section>
      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Jobs per Day"
          subtitle="Based on published_at in the latest 100 jobs"
          labels={perDay.map(([label]) => label)}
          values={perDay.map(([, value]) => value)}
          type="line"
        />
        <ChartCard
          title="Jobs per Organization"
          subtitle="Top organizations in the latest 100 jobs"
          labels={organizations.map(([label]) => label)}
          values={organizations.map(([, value]) => value)}
        />
        <ChartCard
          title="Jobs per Category"
          subtitle="All published jobs"
          labels={categories.map(([label]) => label.replaceAll('_', ' '))}
          values={categories.map(([, value]) => value)}
          type="doughnut"
        />
        <ChartCard
          title="Source Health Status"
          subtitle="Requires a source-health API endpoint"
          labels={[]}
          values={[]}
          type="doughnut"
        />
      </section>
    </>
  );
}
