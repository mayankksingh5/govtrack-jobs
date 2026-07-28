import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJob, getSimilarJobs, recordJobActivity, SITE_URL, trackInteraction } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import JobCard from '../components/JobCard.jsx';
import SEO from '../components/SEO.jsx';
import { DataUnavailable, ErrorState, PageSkeleton } from '../components/States.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { findLink, formatDate, organizationFor, titleFor } from '../utils.js';

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activityMessage, setActivityMessage] = useState('');
  const loader = useCallback(async () => {
    const response = await getJob(id);
    const job = response.data?.[0];
    let related = [];
    if (job) {
      trackInteraction(job.id, 'viewed').catch(() => {});
      if (user) recordJobActivity(job.id, 'viewed').catch(() => {});
      try {
        related = (await getSimilarJobs(job.id, { limit: 4, page: 1 })).data;
      } catch { related = []; }
    }
    return { job, related };
  }, [id, user]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  if (loading) return <PageSkeleton />;
  if (error || !data?.job) return <div className="container py-12"><ErrorState message={error || 'Job not found'} retry={reload} /></div>;

  const job = data.job;
  const title = titleFor(job);
  const organization = organizationFor(job);
  const notification = findLink(job, /notification|official|pdf/i);
  const apply = findLink(job, /apply/i);
  const canonicalPath = `/jobs/${job.id}`;
  const schema = job.type === 'job' ? {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: job.short_info || title,
    datePosted: job.published_at,
    validThrough: job.last_date || undefined,
    hiringOrganization: { '@type': 'Organization', name: organization },
    employmentType: 'OTHER',
    url: `${SITE_URL}${canonicalPath}`,
  } : null;
  const details = [
    ['Organization', organization],
    ['Post Name', job.post_name],
    ['Advertisement Number', null],
    ['Vacancies', job.total_vacancy],
    ['Qualification', job.qualification],
    ['Salary / Pay Level', null],
    ['Age Limit', job.age_limit],
    ['Application Fee', job.fee_info],
    ['Selection Process', null],
    ['Start Date', formatDate(job.apply_start)],
    ['Last Date', formatDate(job.last_date)],
    ['Exam Date', formatDate(job.exam_date)],
  ];
  const shareUrl = `${SITE_URL}${canonicalPath}`;
  const record = async (activity) => {
    if (!user) return navigate('/login', { state: { from: canonicalPath } });
    try {
      await recordJobActivity(job.id, activity);
      setActivityMessage(activity === 'saved' ? 'Job saved.' : 'Application marked.');
    } catch (recordError) {
      setActivityMessage(recordError.message);
    }
  };

  return (
    <>
      <SEO title={title} description={`${title} by ${organization}. Check dates, qualification, vacancies, and official links.`} path={canonicalPath} type="article" schema={schema} />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: 'Jobs', to: '/jobs' }, { label: title }]} />
        <article>
          <header className="rounded-3xl bg-[#123d31] px-6 py-10 text-white sm:px-10">
            <span className="tag border-white/15 bg-white/10 text-[#f7c7a7]">{job.type?.replaceAll('_', ' ')}</span>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
            <Link to={`/organization/${encodeURIComponent(organization)}`} className="mt-4 inline-block text-white/70 hover:text-white">{organization}</Link>
          </header>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="panel">
              <h2 className="font-serif text-2xl font-semibold">Job details</h2>
              <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {details.map(([label, value]) => <div key={label} className="border-b border-[#153c31]/10 py-4"><dt className="text-xs font-bold uppercase tracking-wider text-[#75847f]">{label}</dt><dd className="mt-2 text-sm font-medium">{value || <DataUnavailable />}</dd></div>)}
              </dl>
              {job.short_info && <div className="mt-7"><h2 className="font-serif text-2xl font-semibold">Overview</h2><p className="mt-3 leading-7 text-[#52645f]">{job.short_info}</p></div>}
            </section>
            <aside className="space-y-4">
              <div className="panel">
                <h2 className="font-semibold">Official links</h2>
                <div className="mt-4 grid gap-3">
                  {notification ? <a className="button" href={notification} target="_blank" rel="noopener noreferrer">Official Notification</a> : <DataUnavailable label="Official notification unavailable" />}
                  {apply ? <a className="button-secondary" href={apply} target="_blank" rel="noopener noreferrer">Apply Online</a> : <DataUnavailable label="Apply link unavailable" />}
                  <button className="button-secondary" onClick={() => record('saved')}>Save Job</button>
                  <button className="button-secondary" onClick={() => record('applied')}>Mark as Applied</button>
                  {activityMessage && <p className="text-xs text-[#667771]" role="status">{activityMessage}</p>}
                </div>
              </div>
              <div className="panel">
                <h2 className="font-semibold">Share</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="button-secondary" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <a className="button-secondary" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">X</a>
                  <button className="button-secondary" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy link</button>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Verify all information in the official notification before applying.</div>
            </aside>
          </div>
        </article>
        <section className="section">
          <div className="section-heading"><div><h2>Similar Jobs</h2><p>Rule-based matches by category, organization, and job details</p></div></div>
          {data.related.length ? <div className="grid gap-4 lg:grid-cols-3">{data.related.slice(0, 3).map((item) => <JobCard key={item.id} job={item} />)}</div> : <DataUnavailable label="No related jobs available" />}
        </section>
      </div>
    </>
  );
}
