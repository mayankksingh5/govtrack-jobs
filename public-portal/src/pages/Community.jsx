import { Link } from 'react-router-dom';
import { getLatestQuestions } from '../api.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Icon from '../components/Icon.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States.jsx';
import { SectionHeading } from '../components/UI.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { displayDate } from '../lib/jobs.js';

/* Latest approved questions from every job page, in one place. */
export default function Community() {
  const { data, loading, error, reload } = useRequest(() => getLatestQuestions(40), []);
  const questions = data?.data || [];
  return (
    <main className="listing-page">
      <SEO
        title="Community Questions & Answers"
        description="Questions from job seekers about government jobs, exams, eligibility and dates, with answers from the GovTrack team."
        path="/community"
      />
      <div className="container">
        <Breadcrumbs items={[{ label: 'Community' }]} />
        <div className="listing-title">
          <div>
            <span>COMMUNITY</span>
            <h1>Questions &amp; answers</h1>
            <p>Ask about any job from its page — questions appear here after review.</p>
          </div>
          <Link className="button secondary" to="/jobs"><Icon name="briefcase" size={16} /> Browse jobs</Link>
        </div>
        <section className="calendar-list">
          <SectionHeading eyebrow="LATEST" title="Recent questions" count={questions.length} />
          {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : questions.length ? (
            <div className="question-list">
              {questions.map((question) => (
                <article className="question" key={question.id}>
                  <p className="question-meta">
                    <strong>{question.name}</strong> · {displayDate(question.created_at)} · on{' '}
                    <Link className="text-link" to={`/jobs/${question.job_id}`}>{question.job_title || 'this job'}</Link>
                  </p>
                  <p className="question-text">{question.message}</p>
                  {question.answer && (
                    <div className="question-answer">
                      <Icon name="verified" size={15} />
                      <p><strong>GovTrack team</strong>{question.answer}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No questions yet" description="Open any job and use the Questions & answers box at the bottom of the page." />
          )}
        </section>
      </div>
    </main>
  );
}
