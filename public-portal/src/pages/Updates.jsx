import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getJobs } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { Badge } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { applyFilterBar, newestFirst, organizationsIn, paginate } from '../lib/filters.js';
import { displayDate, orgMarkFor, statusOf, timeAgo } from '../lib/jobs.js';
import { sectorOf } from '../lib/sectors.js';
import { organizationFor, titleFor } from '../utils.js';

const PAGE_SIZE = 12;

/* `type` is the API category; kinds without one are not collected yet. */
export const UPDATE_KINDS = {
  results: {
    type: 'result',
    label: 'Results',
    title: 'Government Exam Results',
    description: 'Official result links, scorecards and merit lists from verified sources.',
  },
  'admit-cards': {
    type: 'admit_card',
    label: 'Admit Cards',
    title: 'Government Exam Admit Cards',
    description: 'Admit card and exam city slip links from official recruitment websites.',
  },
  'answer-keys': {
    type: 'answer_key',
    label: 'Answer Keys',
    title: 'Government Exam Answer Keys',
    description: 'Provisional and final answer keys with objection windows from official sources.',
  },
  'cut-off': {
    type: null,
    label: 'Cut Off',
    title: 'Government Exam Cut Off Marks',
    description: 'Category-wise cut-off marks published by recruiting organizations.',
  },
  syllabus: {
    type: null,
    label: 'Syllabus',
    title: 'Government Exam Syllabus',
    description: 'Syllabus and exam pattern documents from official notifications.',
  },
};

export default function Updates({ kind }) {
  const config = UPDATE_KINDS[kind];
  const [params, setParams] = useSearchParams();
  const filters = {
    q: params.get('q') || '',
    sector: params.get('sector') || '',
    org: params.get('org') || '',
    qualification: params.get('qualification') || '',
  };
  const page = Number(params.get('page')) || 1;

  const loader = useCallback(
    async () => (config.type ? (await getJobs({ category: config.type, page: 1, limit: 100, sort: 'newest' })).data || [] : []),
    [config.type]
  );
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  const matched = useMemo(
    () => applyFilterBar(data || [], filters).sort(newestFirst),
    [data, filters.q, filters.sector, filters.org, filters.qualification]
  );
  const shown = paginate(matched, page, PAGE_SIZE);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <main className="listing-page">
      <SEO title={config.title} description={config.description} path={`/${kind}`} />
      <div className="container">
        <Breadcrumbs items={[{ label: config.label }]} />
        <div className="listing-title">
          <div>
            <span>LATEST UPDATES</span>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
        </div>
        <FilterBar value={filters} onApply={update} organizations={organizationsIn(data || [])} />
        {!config.type ? (
          <EmptyState
            title={`${config.label} updates are coming soon`}
            description="We are adding official sources for this section. Meanwhile, check each recruitment's official notification."
          />
        ) : loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : shown.items.length ? (
          <>
            <div className="result-grid">
              {shown.items.map((job) => (
                <Link className="result-card" key={job.id} to={`/jobs/${job.id}`}>
                  <span className={`mini-mark sector-${sectorOf(job)}`}>{orgMarkFor(job)}</span>
                  <span>
                    <Badge status={statusOf(job)} />
                    <strong>{titleFor(job)}</strong>
                    <small>
                      {organizationFor(job)}
                      {job.exam_date && ` • Exam on ${displayDate(job.exam_date)}`}
                    </small>
                    <em><Icon name="verified" size={14} /> Updated {timeAgo(job.updated_at || job.published_at) || 'recently'}</em>
                  </span>
                  <Icon name="arrow" />
                </Link>
              ))}
            </div>
            <Pagination page={shown.page} pages={shown.pages} onChange={(value) => update({ page: String(value) })} />
          </>
        ) : <EmptyState title={`No ${config.label.toLowerCase()} match these filters`} description="Try a broader keyword or clear some filters." />}
      </div>
    </main>
  );
}
