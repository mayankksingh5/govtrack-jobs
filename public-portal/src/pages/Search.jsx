import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getJobs, searchJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({
    q: params.get('q') || '', organization: params.get('organization') || '',
    qualification: params.get('qualification') || '', category: params.get('category') || '',
  });
  const page = Number(params.get('page')) || 1;
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const load = useCallback(async () => {
    const q = params.get('q');
    const organization = params.get('organization');
    const qualification = params.get('qualification');
    const category = params.get('category');
    if (!q && !organization && !qualification && !category) return setState({ loading: false, data: null, error: null });
    setState({ loading: true, data: null, error: null });
    try {
      const data = q ? await searchJobs({ q, page, limit: 18 }) : await getJobs({ organization, qualification, category, page, limit: 18, sort: 'newest' });
      setState({ loading: false, data, error: null });
    } catch (error) { setState({ loading: false, data: null, error: error.message }); }
  }, [params, page]);
  useEffect(() => { load(); }, [load]);
  const submit = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()));
    setParams({ ...next, page: '1' });
  };
  return (
    <>
      <SEO title="Search Government Jobs" description="Search published government opportunities by keyword, organization, qualification, and category." path="/search" />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: 'Advanced Search' }]} />
        <div className="page-heading"><h1>Advanced Search</h1><p>Use supported API filters to narrow published records.</p></div>
        <form onSubmit={submit} className="filter-panel">
          <input className="input lg:col-span-2" value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="Search keyword" aria-label="Search keyword" />
          <input className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value, q: '' })} placeholder="Organization" />
          <input className="input" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value, q: '' })} placeholder="Qualification" />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, q: '' })}><option value="">Category</option><option value="job">Job</option><option value="admit_card">Admit card</option><option value="result">Result</option><option value="answer_key">Answer key</option></select>
          <input className="input" disabled placeholder="State — data unavailable" /><input className="input" disabled placeholder="Experience — data unavailable" /><input className="input" disabled placeholder="Last date — filter unavailable" />
          <button className="button">Search</button>
        </form>
        <div className="mt-8">{state.loading ? <PageSkeleton /> : state.error ? <ErrorState message={state.error} retry={load} /> : !state.data ? <EmptyState title="Start your search" description="Enter a keyword or a supported filter." /> : !state.data.data.length ? <EmptyState title="No matching jobs" description="Try broader search terms." /> : <div className="grid gap-4 lg:grid-cols-3">{state.data.data.map((job) => <JobCard key={job.id} job={job} />)}</div>}</div>
        {state.data && <Pagination page={state.data.page} pages={state.data.pages} onChange={(value) => setParams((current) => { current.set('page', value); return current; })} />}
      </div>
    </>
  );
}
