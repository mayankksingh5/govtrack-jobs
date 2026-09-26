import { useCallback, useState } from 'react';
import { askQuestion, getQuestions } from '../api.js';
import { useRequest } from '../hooks/useRequest.js';
import { displayDate } from '../lib/jobs.js';
import Icon from './Icon.jsx';
import { SectionHeading } from './UI.jsx';

/* Community questions on a job page. New questions appear after admin review. */
export default function JobQuestions({ jobId }) {
  const loader = useCallback(() => getQuestions(jobId), [jobId]);
  const { data } = useRequest(loader, [loader]);
  const [form, setForm] = useState({ name: '', message: '', website: '' });
  const [state, setState] = useState({ text: '' });
  const questions = data?.data || [];
  const enabled = data?.meta?.enabled !== false;

  const submit = async (event) => {
    event.preventDefault();
    setState({ text: 'Sending…', sending: true });
    try {
      await askQuestion(jobId, form);
      setForm({ name: form.name, message: '', website: '' });
      setState({ text: 'Thanks! Your question will appear here after review.' });
    } catch (error) {
      setState({ text: error.message, error: true });
    }
  };

  return (
    <section className="info-card questions-card">
      <SectionHeading eyebrow="COMMUNITY" title="Questions & answers" count={questions.length} />
      {questions.length ? (
        <div className="question-list">
          {questions.map((question) => (
            <article className="question" key={question.id}>
              <p className="question-meta"><strong>{question.name}</strong> · {displayDate(question.created_at)}</p>
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
        <p className="form-message">No questions yet. Ask the first one below.</p>
      )}
      {enabled ? (
        <form className="form-grid two question-form" onSubmit={submit}>
          <label className="field">
            <span>Your name</span>
            <input required minLength="2" maxLength="60" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          {/* Honeypot for bots; hidden from people and screen readers. */}
          <label className="question-trap" aria-hidden="true">
            Website
            <input tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </label>
          <label className="field span-2">
            <span>Your question</span>
            <textarea required minLength="5" maxLength="1000" rows="3" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Ask about eligibility, dates, exam pattern…" />
          </label>
          <p className="form-message span-2">Questions are published after review. Do not share phone numbers or personal details.</p>
          <button className="button primary" disabled={state.sending}>Ask question</button>
          {state.text && !state.sending && <p className={`form-message ${state.error ? 'error' : ''}`} role="status">{state.text}</p>}
        </form>
      ) : (
        <p className="form-message">Questions will open soon.</p>
      )}
    </section>
  );
}
