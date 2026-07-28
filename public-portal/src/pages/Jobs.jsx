import { useCallback, useEffect, useState } from 'react';
import { getJobs, searchJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';

export default function Jobs() {
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [organization, setOrganization] = useState('');
  const [qualification, setQualification] = useState('');
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = query
        ? await searchJobs({ q: query, page, limit: 18 })
        : await getJobs({ page, limit: 18, sort: 'newest', category: category || undefined, organization: organization || undefined, qualification: qualification || undefined });
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }, [page, query, category, organization, qualification]);
  useEffect(() => { load(); }, [load]);

  const search = (event) => { event.preventDefault(); setPage(1); setQuery(keyword.trim()); };
  return (
    <>
      <SEO title="Latest Government Jobs" description="Browse and filter the latest published government job opportunities." path="/jobs" />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: 'Latest Jobs' }]} />
        <div className="page-heading"><h1>Latest Government Jobs</h1><p>Published opportunities with direct official links.</p></div>
        <form onSubmit={search} className="filter-panel">
          <input className="input lg:col-span-2" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search jobs…" aria-label="Search jobs" />
          <input className="input" value={organization} onChange={(e) => { setOrganization(e.target.value); setQuery(''); setPage(1); }} placeholder="Organization" aria-label="Filter by organization" />
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setQuery(''); setPage(1); }} aria-label="Filter by category">
            <option value="">All categories</option><option value="job">Jobs</option><option value="admit_card">Admit cards</option><option value="result">Results</option><option value="answer_key">Answer keys</option>
          </select>
          <input className="input" value={qualification} onChange={(e) => { setQualification(e.target.value); setQuery(''); setPage(1); }} placeholder="Qualification" aria-label="Filter by qualification" />
          <select className="input" aria-label="Sort jobs" defaultValue="newest"><option value="newest">Newest first</option></select>
          <button className="button">Search</button>
        </form>
        <div className="mt-6 flex items-center justify-between"><p className="text-sm text-[#667771]">{state.data?.total ?? 0} records</p><div className="flex gap-2"><button className={`button-secondary ${view === 'grid' ? 'selected' : ''}`} onClick={() => setView('grid')} aria-label="Grid view">Grid</button><button className={`button-secondary ${view === 'list' ? 'selected' : ''}`} onClick={() => setView('list')} aria-label="List view">List</button></div></div>
        <div className="mt-5">
          {state.loading ? <PageSkeleton /> : state.error ? <ErrorState message={state.error} retry={load} /> : !state.data.data.length ? <EmptyState title="No jobs found" description="Try changing your filters." /> : <div className={view === 'grid' ? 'grid gap-4 lg:grid-cols-3' : 'grid gap-4'}>{state.data.data.map((job) => <JobCard key={job.id} job={job} view={view} />)}</div>}
        </div>
        {state.data && <Pagination page={state.data.page} pages={state.data.pages} onChange={setPage} />}
      </div>
    </>
  );
}
