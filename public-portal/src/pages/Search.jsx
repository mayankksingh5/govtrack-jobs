import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getJobs, searchJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { applyFilterBar, applyRefine, organizationsIn, paginate, REFINE_GROUPS, SORTS } from '../lib/filters.js';

const PAGE_SIZE = 10;

/* Used for both /jobs (job notices only) and /search (every update type). */
export default function Search({ mode = 'search' }) {
  const [params, setParams] = useSearchParams();
  const [refine, setRefine] = useState({});
  const filters = {
    q: params.get('q') || '',
    sector: params.get('sector') || '',
    org: params.get('org') || '',
    qualification: params.get('qualification') || '',
  };
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'Latest';
  const page = Number(params.get('page')) || 1;

  const loader = useCallback(async () => {
    const response = filters.q
      ? await searchJobs({ q: filters.q, page: 1, limit: 100 })
      : await getJobs({ category: mode === 'jobs' ? 'job' : undefined, page: 1, limit: 100, sort: 'newest' });
    const records = response.data || [];
    return mode === 'jobs' ? records.filter((job) => job.type === 'job') : records;
  }, [filters.q, mode]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);

  const base = useMemo(() => applyFilterBar(data || [], filters), [data, filters.q, filters.sector, filters.org, filters.qualification]);
  const matched = useMemo(() => applyRefine(base, refine).sort(SORTS[sort]), [base, refine, sort]);
  const shown = paginate(matched, page, PAGE_SIZE);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const toggle = (group, option) => {
    setRefine((current) => {
      const chosen = current[group] || [];
      const nextChosen = option == null ? [] : chosen.includes(option) ? chosen.filter((item) => item !== option) : [...chosen, option];
      return { ...current, [group]: nextChosen };
    });
    update({});
  };

  const path = mode === 'jobs' ? '/jobs' : '/search';
  return (
    <main className="listing-page">
      <SEO
        title={filters.q ? `${filters.q} — Search` : 'Search Government Jobs'}
        description="Search government jobs and exams by keyword, sector, organization, qualification, status and dates."
        path={path}
      />
      <div className="container">
        <Breadcrumbs items={[{ label: mode === 'jobs' ? 'Jobs' : 'Search Jobs' }]} />
        <div className="listing-title">
          <div>
            <span>DISCOVER OPPORTUNITIES</span>
            <h1>Search Government Jobs</h1>
            <p>Find the right opportunity across departments, sectors and qualifications.</p>
          </div>
        </div>
        <FilterBar value={filters} onApply={update} organizations={organizationsIn(data || [])} />
        <div className="search-toolbar">
          <p>
            <strong>{matched.length} {matched.length === 1 ? 'opportunity' : 'opportunities'}</strong>
            <span> matched your filters</span>
          </p>
          <label>
            Sort by{' '}
            <select value={sort} onChange={(event) => update({ sort: event.target.value === 'Latest' ? '' : event.target.value })}>
              {Object.keys(SORTS).map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="search-layout">
          <aside className="filter-panel">
            <h3>Refine results</h3>
            {REFINE_GROUPS.map((group) => {
              const chosen = refine[group.key] || [];
              return (
                <div className="filter-group" key={group.key}>
                  <strong>{group.label}</strong>
                  <label>
                    <input type="checkbox" checked={!chosen.length} onChange={() => toggle(group.key, null)} />
                    All
                    <small>{base.length}</small>
                  </label>
                  {Object.entries(group.options).map(([option, test]) => (
                    <label key={option}>
                      <input type="checkbox" checked={chosen.includes(option)} onChange={() => toggle(group.key, option)} />
                      {option}
                      <small>{base.filter(test).length}</small>
                    </label>
                  ))}
                </div>
              );
            })}
          </aside>
          <div className="job-list">
            {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : shown.items.length ? (
              <>
                {shown.items.map((job) => <JobCard job={job} key={job.id} />)}
                <Pagination page={shown.page} pages={shown.pages} onChange={(value) => update({ page: String(value) })} />
              </>
            ) : <EmptyState title="No opportunities match these filters" description="Try a broader keyword or clear some filters." />}
          </div>
        </div>
      </div>
    </main>
  );
}
