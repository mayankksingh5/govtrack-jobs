export function PageSkeleton() {
  return <div className="container py-12"><div className="animate-pulse space-y-4">{[120, 72, 72, 72].map((height, index) => <div key={index} style={{ height }} className="rounded-2xl bg-[#123d31]/8" />)}</div></div>;
}

export function ErrorState({ message, retry }) {
  return <div className="state-box border-red-200 bg-red-50"><p className="font-semibold text-red-800">Something went wrong</p><p className="mt-1 text-sm text-red-700/75">{message}</p>{retry && <button className="button mt-4" onClick={retry}>Try again</button>}</div>;
}

export function EmptyState({ title = 'No data available', description = 'There is nothing to display right now.' }) {
  return <div className="state-box"><span className="text-2xl" aria-hidden="true">○</span><p className="mt-2 font-semibold">{title}</p><p className="mx-auto mt-1 max-w-lg text-sm text-[#52645f]">{description}</p></div>;
}

export function DataUnavailable({ label = 'Data unavailable' }) {
  return <span className="text-sm text-[#72807c]">{label}</span>;
}
