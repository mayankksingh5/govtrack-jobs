import { getJobs, getLatest, getStatistics } from '../api.js';
import { CategoryCard, OrganizationCard } from '../components/Cards.jsx';
import JobCard from '../components/JobCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { groupByCount } from '../utils.js';
import RecommendedSection from '../components/RecommendedSection.jsx';

const categories = [
  ['PSU', 'psu', 'Public sector opportunities'],
  ['SSC', 'ssc', 'Staff Selection Commission'],
  ['UPSC', 'upsc', 'Union Public Service Commission'],
  ['Banking', 'banking', 'Public banking careers'],
  ['Railway', 'railway', 'Railway recruitment'],
  ['Defence', 'defence', 'Armed forces and defence'],
  ['Teaching', 'teaching', 'Education and teaching'],
  ['Engineering', 'engineering', 'Technical opportunities'],
];

function JobSection({ title, description, jobs, unavailable }) {
  return (
    <section className="section">
      <div className="section-heading"><div><h2>{title}</h2><p>{description}</p></div></div>
      {unavailable ? <EmptyState title="Data unavailable" description={unavailable} /> : jobs?.length ? (
        <div className="grid gap-4 lg:grid-cols-3">{jobs.slice(0, 6).map((job) => <JobCard key={job.id} job={job} />)}</div>
      ) : <EmptyState title={`No ${title.toLowerCase()}`} description="No published records are currently available." />}
    </section>
  );
}

export default function Home() {
  const { data, loading, error, reload } = useRequest(async () => {
    const [latest, stats, admit, results, keys] = await Promise.all([
      getLatest(12),
      getStatistics(),
      getJobs({ category: 'admit_card', limit: 6, page: 1, sort: 'newest' }),
      getJobs({ category: 'result', limit: 6, page: 1, sort: 'newest' }),
      getJobs({ category: 'answer_key', limit: 6, page: 1, sort: 'newest' }),
    ]);
    return { latest: latest.data || [], stats: stats.data?.[0] || {}, admit: admit.data || [], results: results.data || [], keys: keys.data || [] };
  }, []);

  return (
    <>
      <SEO title="" description="Discover current government jobs, admit cards, results, and answer keys with direct official links." />
      <section className="hero">
        <div className="container py-20 text-center sm:py-28">
          <p className="eyebrow">CURRENT OPPORTUNITIES · OFFICIAL SOURCES</p>
          <h1 className="mx-auto mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">Your next public service opportunity, clearly presented.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#596b65] sm:text-lg">Search published government openings and move directly to the official notification or application.</p>
          <div className="mt-9"><SearchBar /></div>
        </div>
      </section>
      {loading ? <PageSkeleton /> : error ? <div className="container py-12"><ErrorState message={error} retry={reload} /></div> : (
        <div className="container">
          <RecommendedSection />
          <JobSection title="Latest Jobs" description="Recently published opportunities" jobs={data.latest.filter((job) => job.type === 'job')} />
          <JobSection title="Featured Jobs" description="Highlighted opportunities" unavailable="The API does not expose a featured-jobs field." />
          <section className="section">
            <div className="section-heading"><div><h2>Top Organizations</h2><p>Organizations represented in recent published jobs</p></div></div>
            {groupByCount(data.latest, (job) => job.organization || job.source_name).length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{groupByCount(data.latest, (job) => job.organization || job.source_name).slice(0, 8).map(([name, count]) => <OrganizationCard key={name} name={name} count={count} />)}</div> : <EmptyState />}
          </section>
          <section className="section">
            <div className="section-heading"><div><h2>Popular Categories</h2><p>Browse common government recruitment sectors</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map(([label, slug, description]) => <CategoryCard key={slug} label={label} slug={slug} description={description} />)}</div>
          </section>
          <JobSection title="Latest Admit Cards" description="Recently published examination documents" jobs={data.admit} />
          <JobSection title="Latest Results" description="Recently published selections and results" jobs={data.results} />
          <JobSection title="Latest Answer Keys" description="Recently published answer keys" jobs={data.keys} />
          <JobSection title="Latest Syllabus" description="Recently published syllabi" unavailable="The API has no syllabus category." />
          <section className="section">
            <div className="rounded-3xl bg-[#123d31] px-6 py-10 text-white sm:px-10">
              <p className="eyebrow text-[#f3a06e]">PORTAL STATISTICS</p>
              <div className="mt-7 grid gap-8 sm:grid-cols-3">
                <div><strong className="font-serif text-4xl">{data.stats.published_jobs ?? 0}</strong><span className="mt-1 block text-sm text-white/60">Published records</span></div>
                {Object.entries(data.stats.by_category || {}).slice(0, 2).map(([label, count]) => <div key={label}><strong className="font-serif text-4xl">{count}</strong><span className="mt-1 block text-sm capitalize text-white/60">{label.replaceAll('_', ' ')}</span></div>)}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
