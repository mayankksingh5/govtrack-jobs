import { useEffect, useState } from 'react';
import { QUALIFICATIONS } from '../lib/filters.js';
import { SECTOR_KEYS, SECTORS } from '../lib/sectors.js';
import Icon from './Icon.jsx';

/*
  Keyword / Category / Organization / (Qualification or Month) filter bar.
  Holds a draft locally and hands it to `onApply` when "Apply filters" is used.
  Pass `months` (array of [value, label]) to show the calendar variant.
*/
export default function FilterBar({ value, onApply, organizations = [], months }) {
  const [draft, setDraft] = useState(value);
  const serialized = JSON.stringify(value);
  useEffect(() => setDraft(JSON.parse(serialized)), [serialized]);

  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onApply({ ...draft, q: (draft.q || '').trim() });
  };

  return (
    <form className="advanced-filters" onSubmit={submit}>
      <label>
        <span>Keyword</span>
        <div>
          <Icon name="search" size={17} />
          <input value={draft.q || ''} onChange={set('q')} placeholder="Search exams or jobs" />
        </div>
      </label>
      <label>
        <span>Category</span>
        <select value={draft.sector || ''} onChange={set('sector')}>
          <option value="">All categories</option>
          {SECTOR_KEYS.map((key) => <option key={key} value={key}>{SECTORS[key].label}</option>)}
        </select>
      </label>
      <label>
        <span>Organization</span>
        <select value={draft.org || ''} onChange={set('org')}>
          <option value="">All organizations</option>
          {organizations.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      {months ? (
        <label>
          <span>Month</span>
          <select value={draft.month || ''} onChange={set('month')}>
            {months.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      ) : (
        <label>
          <span>Qualification</span>
          <select value={draft.qualification || ''} onChange={set('qualification')}>
            <option value="">Any qualification</option>
            {Object.keys(QUALIFICATIONS).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      )}
      <button className="button primary" type="submit">
        <Icon name="filter" size={16} /> Apply filters
      </button>
    </form>
  );
}
