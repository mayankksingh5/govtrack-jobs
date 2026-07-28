import { useCallback, useEffect, useState } from 'react';
import { getJobs, searchJobs } from '../api.js';
import { EmptyState, ErrorState, Modal, PageHeader, Skeleton } from '../components/UI.jsx';
import { useToast } from '../components/Toast.jsx';
import { findLink, formatDate, jobTitle } from '../utils.js';

const categories = ['', 'job', 'admit_card', 'result', 'answer_key', 'other'];

export default function Jobs() {
  const notify = useToast();
  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [organization, setOrganization] = useState('');
  const [qualification, setQualification] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = committedQuery
        ? await searchJobs({ q: committedQuery, page, limit: 20 })
        : await getJobs({
            page,
            limit: 20,
            sort: 'newest',
            category: category || undefined,
            organization: organization || undefined,
            qualification: qualification || undefined,
          });
      setState({ data: response, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error.message });
      notify(error.message, 'error');
    }
  }, [committedQuery, category, organization, qualification, page, notify]);

  useEffect(() => {
    const timer = window.setTimeout(load, 150);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setCommittedQuery(query.trim());
  };
  const jobs = state.data?.data || [];

  return (
    <>
      <PageHeader title="Jobs" description="Search and inspect published government job records." />
      <div className="panel mb-4">
        <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs…" />
          <input
            className="input"
            value={organization}
            onChange={(e) => { setOrganization(e.target.value); setCommittedQuery(''); setPage(1); }}
            placeholder="Organization"
          />
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setCommittedQuery(''); setPage(1); }}>
            {categories.map((value) => <option key={value} value={value}>{value ? value.replaceAll('_', ' ') : 'All categories'}</option>)}
          </select>
          <input
            className="input"
            value={qualification}
            onChange={(e) => { setQualification(e.target.value); setCommittedQuery(''); setPage(1); }}
            placeholder="Qualification"
          />
          <button className="button" type="submit">Search</button>
        </form>
      </div>

      <div className="panel overflow-hidden p-0">
        {state.loading ? <div className="p-5"><Skeleton rows={7} /></div> : state.error ? (
          <div className="p-5"><ErrorState message={state.error} retry={load} /></div>
        ) : !jobs.length ? <EmptyState title="No jobs found" description="Try changing the search or filters." /> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Job</th><th>Organization</th><th>Category</th><th>Published</th><th>Last date</th><th>Actions</th></tr></thead>
              <tbody>
                {jobs.map((job) => {
                  const pdf = findLink(job, /notification|pdf/i);
                  const apply = findLink(job, /apply/i);
                  return (
                    <tr key={job.id}>
                      <td><p className="max-w-md font-medium">{jobTitle(job)}</p><p className="mt-1 text-xs text-slate-500">#{job.id}</p></td>
                      <td>{job.organization || job.source_name || '—'}</td>
                      <td><span className="tag">{job.type?.replaceAll('_', ' ')}</span></td>
                      <td>{formatDate(job.published_at)}</td>
                      <td>{formatDate(job.last_date, '—')}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button className="link-button" onClick={() => setSelected(job)}>Details</button>
                          {pdf && <a className="link-button" href={pdf} target="_blank" rel="noreferrer">PDF</a>}
                          {apply && <a className="link-button" href={apply} target="_blank" rel="noreferrer">Apply</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {state.data && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm dark:border-white/10">
            <span className="text-slate-500">Page {state.data.page} of {Math.max(state.data.pages, 1)} · {state.data.total} jobs</span>
            <div className="flex gap-2">
              <button className="button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <button className="button-secondary" disabled={page >= state.data.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? jobTitle(selected) : ''}>
        {selected && (
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Organization', selected.organization || selected.source_name],
              ['Post name', selected.post_name],
              ['Category', selected.type],
              ['Published', formatDate(selected.published_at)],
              ['Application starts', formatDate(selected.apply_start, '—')],
              ['Last date', formatDate(selected.last_date, '—')],
              ['Exam date', formatDate(selected.exam_date, '—')],
              ['Vacancies', selected.total_vacancy],
              ['Age limit', selected.age_limit],
              ['Qualification', selected.qualification],
              ['Fee', selected.fee_info],
            ].map(([label, value]) => (
              <div key={label}><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm">{value || '—'}</dd></div>
            ))}
          </dl>
        )}
      </Modal>
    </>
  );
}
