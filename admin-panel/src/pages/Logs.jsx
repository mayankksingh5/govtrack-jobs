import { useState } from 'react';
import { EmptyState, PageHeader } from '../components/UI.jsx';

const tabs = ['Zero Result Logs', 'Failure Diagnosis', 'Duplicate Logs', 'PDF Parser Logs'];

export default function Logs() {
  const [active, setActive] = useState(tabs[0]);
  return (
    <>
      <PageHeader title="Logs" description="Operational scraper and parser event logs." />
      <div className="panel">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-4 dark:border-white/10">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActive(tab)} className={active === tab ? 'tab active' : 'tab'}>
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" placeholder={`Search ${active.toLowerCase()}…`} disabled />
          <button className="button-secondary" disabled>Download JSON</button>
        </div>
        <EmptyState
          title={`${active} unavailable`}
          description="The existing REST API does not expose log endpoints. Search, pagination, and JSON download will activate when an approved endpoint is available."
        />
      </div>
    </>
  );
}
