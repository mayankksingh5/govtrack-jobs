import { useEffect, useRef } from 'react';

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0d1a17] ${className}`}
    >
      {children}
    </div>
  );
}

export function MetricCard({ label, value, detail, tone = 'default' }) {
  const tones = {
    default: 'text-slate-950 dark:text-white',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-bold tracking-tight ${tones[tone]}`}>{value}</p>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </Card>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 rounded-xl bg-slate-200 dark:bg-white/7" />
      ))}
    </div>
  );
}

export function ErrorState({ message, retry }) {
  return (
    <Card className="border-red-300/60 dark:border-red-400/20">
      <p className="font-semibold text-red-600 dark:text-red-300">Unable to load data</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      {retry && (
        <button onClick={retry} className="button mt-4">
          Try again
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xl dark:bg-white/6">
        ∅
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const handler = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" onMouseDown={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-white p-5 shadow-2xl dark:bg-[#0d1a17]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button ref={closeRef} onClick={onClose} className="button-secondary">
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
