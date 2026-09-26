import { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminQuestions, updateAdminQuestion } from '../../api.js';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../../components/States.jsx';
import { SectionHeading } from '../../components/UI.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { timeAgo } from '../../lib/jobs.js';

const TABS = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']];

function QuestionRow({ question, status, onSaved }) {
  const [answer, setAnswer] = useState(question.answer || '');
  const [state, setState] = useState({ text: '' });
  const save = async (next) => {
    setState({ text: 'Saving…', busy: true });
    try {
      await updateAdminQuestion(question.id, { status: next, answer: answer.trim() || null });
      onSaved();
    } catch (error) {
      setState({ text: error.message, error: true });
    }
  };
  return (
    <article className="question admin-question">
      <p className="question-meta">
        <strong>{question.name}</strong> · {timeAgo(question.created_at)} · on{' '}
        <Link className="text-link" to={`/jobs/${question.job_id}`}>{question.job_title || `job #${question.job_id}`}</Link>
      </p>
      <p className="question-text">{question.message}</p>
      <label className="field">
        <span>Answer (optional, shown as "GovTrack team")</span>
        <textarea rows="2" maxLength="2000" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </label>
      <div className="admin-row-actions">
        {status !== 'rejected' && (
          <button className="button secondary danger" disabled={state.busy} onClick={() => save('rejected')}>Reject</button>
        )}
        {status === 'rejected' && (
          <button className="button secondary" disabled={state.busy} onClick={() => save('pending')}>Restore</button>
        )}
        <button className="button primary" disabled={state.busy} onClick={() => save('approved')}>
          {status === 'approved' ? 'Save answer' : 'Approve'}
        </button>
      </div>
      {state.text && !state.busy && <p className={`form-message ${state.error ? 'error' : ''}`}>{state.text}</p>}
    </article>
  );
}

export default function AdminQuestions() {
  const [params, setParams] = useSearchParams();
  const status = TABS.some(([key]) => key === params.get('status')) ? params.get('status') : 'pending';
  const loader = useCallback(() => getAdminQuestions({ status }), [status]);
  const { data, loading, error, reload } = useRequest(loader, [loader]);
  const questions = data?.data || [];

  return (
    <main className="listing-page">
      <Helmet><title>Questions | GovTrack Jobs</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Questions' }]} />
        <div className="listing-title">
          <div>
            <span>COMMUNITY</span>
            <h1>Visitor questions</h1>
            <p>Questions appear on job pages only after you approve them. Add an answer if you can.</p>
          </div>
          <Link className="button secondary" to="/admin">Back to jobs</Link>
        </div>
        <div className="filter-strip admin-toolbar">
          <div>
            {TABS.map(([key, label]) => (
              <button key={key} className={status === key ? 'active' : ''} onClick={() => setParams(key === 'pending' ? {} : { status: key })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <section className="calendar-list">
          <SectionHeading eyebrow="MODERATION" title={TABS.find(([key]) => key === status)[1]} count={questions.length} />
          {loading ? <PageSkeleton /> : error ? <ErrorState message={error} retry={reload} /> : data?.meta?.enabled === false ? (
            <EmptyState title="Questions are not switched on yet" description="Run migrations/2026-09-26-job-questions.sql once in the Supabase SQL Editor." />
          ) : questions.length ? (
            <div className="question-list">
              {questions.map((question) => (
                <QuestionRow key={`${question.id}-${question.status}`} question={question} status={status} onSaved={reload} />
              ))}
            </div>
          ) : <EmptyState title="Nothing here" description="New visitor questions will show up in Waiting." />}
        </section>
      </div>
    </main>
  );
}
