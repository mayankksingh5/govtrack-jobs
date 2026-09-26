import { useCallback, useState } from 'react';
import { getRecommendations, savePreferences } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';

const split = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const FIELDS = [
  ['qualification', 'Qualification', 'text'],
  ['skills', 'Skills (comma separated)', 'text'],
  ['experience_years', 'Experience (years)', 'number'],
  ['preferred_states', 'Preferred states', 'text'],
  ['preferred_organizations', 'Preferred organizations', 'text'],
  ['preferred_categories', 'Categories: job, result…', 'text'],
  ['preferred_salary_min', 'Minimum salary', 'number'],
  ['preferred_salary_max', 'Maximum salary', 'number'],
];

export default function Recommendations() {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState({ text: '' });
  const [form, setForm] = useState(Object.fromEntries(FIELDS.map(([key]) => [key, ''])));
  const loader = useCallback(() => getRecommendations({ page, limit: 10 }), [page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  const number = (value) => (value === '' ? null : Number(value));

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: 'Saving…' });
    try {
      await savePreferences({
        qualification: form.qualification || null,
        skills: split(form.skills),
        experience_years: number(form.experience_years),
        preferred_states: split(form.preferred_states),
        preferred_organizations: split(form.preferred_organizations),
        preferred_categories: split(form.preferred_categories),
        preferred_salary_min: number(form.preferred_salary_min),
        preferred_salary_max: number(form.preferred_salary_max),
      });
      setMessage({ text: 'Preferences saved.' });
      setPage(1);
      reload();
    } catch (saveError) {
      setMessage({ text: saveError.message, error: true });
    }
  };

  return (
    <main className="listing-page">
      <SEO title="Recommended Jobs" description="Personalized, explainable government job recommendations based on your preferences." path="/for-you" />
      <div className="container">
        <Breadcrumbs items={[{ label: 'For You' }]} />
        <div className="listing-title">
          <div>
            <span>PERSONALIZED</span>
            <h1>Recommended for You</h1>
            <p>Rule-based matches from your preferences and recent activity.</p>
          </div>
        </div>
        <form onSubmit={submit} className="form-card wide form-grid two" style={{ marginBottom: 20 }}>
          {FIELDS.map(([key, label, type]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input type={type} min={type === 'number' ? 0 : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
          <button className="button primary span-2">Save preferences</button>
          {message.text && <p className={`form-message span-2 ${message.error ? 'error' : ''}`} role="status">{message.text}</p>}
        </form>
        <div className="job-list">
          {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : data.data.length ? (
            data.data.map((job) => (
              <div key={job.id} className="job-list">
                <JobCard job={job} />
                <p className="match-note">
                  Match score: {job.recommendation_score}% · {(job.recommendation_reasons || []).map((reason) => reason.factor.replaceAll('_', ' ')).join(', ') || 'recency'}
                </p>
              </div>
            ))
          ) : <EmptyState title="No recommendations found" description="Adjust your preferences or check again when new jobs are published." />}
        </div>
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </main>
  );
}
