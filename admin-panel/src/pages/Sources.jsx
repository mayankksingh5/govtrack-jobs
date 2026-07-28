import { EmptyState, PageHeader } from '../components/UI.jsx';

export default function Sources() {
  return (
    <>
      <PageHeader title="Sources" description="Scraper source health and extraction status." />
      <div className="panel">
        <EmptyState
          title="Source health is not exposed by the API"
          description="The existing REST API has no source-list or source-health endpoint. This panel intentionally does not read local scraper files or fabricate source data."
        />
        <div className="mx-auto grid max-w-3xl gap-3 border-t border-slate-200 pt-6 dark:border-white/10 sm:grid-cols-2">
          <button className="button-secondary" disabled>View Logs</button>
          <button className="button-secondary" disabled>View Diagnostics</button>
        </div>
      </div>
    </>
  );
}
