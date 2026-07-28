import { API_URL, getHealth } from '../api.js';
import { ErrorState, PageHeader, Skeleton } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

export default function Settings() {
  const { data, loading, error, reload } = useApi(getHealth, []);
  return (
    <>
      <PageHeader title="Settings" description="Read-only application and API configuration." />
      {loading ? <Skeleton rows={4} /> : error ? <ErrorState message={error} retry={reload} /> : (
        <div className="panel max-w-3xl">
          <dl className="divide-y divide-slate-200 dark:divide-white/10">
            {[
              ['API URL', API_URL],
              ['Environment', import.meta.env.VITE_APP_ENV || import.meta.env.MODE],
              ['Version', import.meta.env.VITE_APP_VERSION || '1.0.0'],
              ['Health Status', data?.data?.[0]?.status === 'ok' ? 'Healthy' : 'Unknown'],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="break-all text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </>
  );
}
