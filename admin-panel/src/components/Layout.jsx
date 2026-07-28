import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../auth/AuthContext.jsx';

const navigation = [
  ['Dashboard', '/dashboard', '▦'],
  ['Jobs', '/jobs', '▤'],
  ['Sources', '/sources', '◉'],
  ['Logs', '/logs', '≡'],
  ['Statistics', '/statistics', '⌁'],
  ['Settings', '/settings', '⚙'],
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('admin-theme') !== 'light');
  const title = navigation.find(([, path]) => location.pathname.startsWith(path))?.[0] || 'Admin';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('admin-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-[#07100e] dark:text-slate-100">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-white/10 dark:bg-[#0b1714] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-slate-200 px-6 py-6 dark:border-white/10">
          <p className="text-[10px] font-bold tracking-[.22em] text-emerald-600 dark:text-emerald-400">
            GOVERNMENT JOBS
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight">Operations Admin</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map(([label, path, icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                }`
              }
            >
              <span className="w-5 text-center text-base" aria-hidden="true">
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="m-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Admin workspace
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Protected administrator session.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#07100e]/85 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 lg:hidden dark:border-white/10"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div>
              <p className="text-xs text-slate-500">Admin / {title}</p>
              <h1 className="text-base font-semibold">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">{user?.email}</span>
            <button onClick={() => setDark((value) => !value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5" aria-label="Toggle dark mode">{dark ? '☀ Light' : '◐ Dark'}</button>
            <button onClick={logout} className="button-secondary">Logout</button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
