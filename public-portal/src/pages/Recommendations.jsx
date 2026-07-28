import { useCallback, useState } from 'react';
import { getRecommendations, savePreferences } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';

const split = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function Recommendations() {
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState('');
  const [form, setForm] = useState({
    qualification: '', skills: '', experience_years: '', preferred_states: '',
    preferred_organizations: '', preferred_categories: '', preferred_salary_min: '',
    preferred_salary_max: '',
  });
  const loader = useCallback(() => getRecommendations({ page, limit: 12 }), [page]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);

  const submit = async (event) => {
    event.preventDefault();
    setSaved('Saving…');
    try {
      await savePreferences({
        qualification: form.qualification || null,
        skills: split(form.skills),
        experience_years: form.experience_years === '' ? null : Number(form.experience_years),
        preferred_states: split(form.preferred_states),
        preferred_organizations: split(form.preferred_organizations),
        preferred_categories: split(form.preferred_categories),
        preferred_salary_min: form.preferred_salary_min === '' ? null : Number(form.preferred_salary_min),
        preferred_salary_max: form.preferred_salary_max === '' ? null : Number(form.preferred_salary_max),
      });
      setSaved('Preferences saved.');
      setPage(1);
      reload();
    } catch (saveError) {
      setSaved(saveError.message);
    }
  };

  return (
    <>
      <SEO title="Recommended Jobs" description="Personalized, explainable government job recommendations based on your preferences." path="/for-you" />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: 'For You' }]} />
        <div className="page-heading"><h1>Recommended for You</h1><p>Rule-based matches personalized to this device. Sign-in identity can replace the device ID when authentication is added.</p></div>
        <form onSubmit={submit} className="filter-panel mt-8">
          <input className="input" placeholder="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          <input className="input" placeholder="Skills, comma separated" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          <input className="input" type="number" min="0" max="80" placeholder="Experience years" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
          <input className="input" placeholder="Preferred states" value={form.preferred_states} onChange={(e) => setForm({ ...form, preferred_states: e.target.value })} />
          <input className="input" placeholder="Preferred organizations" value={form.preferred_organizations} onChange={(e) => setForm({ ...form, preferred_organizations: e.target.value })} />
          <input className="input" placeholder="Categories: job, result…" value={form.preferred_categories} onChange={(e) => setForm({ ...form, preferred_categories: e.target.value })} />
          <input className="input" type="number" min="0" placeholder="Minimum salary" value={form.preferred_salary_min} onChange={(e) => setForm({ ...form, preferred_salary_min: e.target.value })} />
          <input className="input" type="number" min="0" placeholder="Maximum salary" value={form.preferred_salary_max} onChange={(e) => setForm({ ...form, preferred_salary_max: e.target.value })} />
          <button className="button">Save preferences</button>
          {saved && <p className="self-center text-sm text-[#667771]" role="status">{saved}</p>}
        </form>
        <div className="mt-8">{loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : !data.data.length ? <EmptyState title="No recommendations found" description="Adjust your preferences or check again when new jobs are published." /> : <div className="grid gap-4 lg:grid-cols-3">{data.data.map((job) => <div key={job.id}><JobCard job={job} /><p className="mt-2 text-xs text-[#667771]">Match score: {job.recommendation_score}% · {(job.recommendation_reasons || []).map((reason) => reason.factor.replaceAll('_', ' ')).join(', ') || 'recency'}</p></div>)}</div>}</div>
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </>
  );
}
