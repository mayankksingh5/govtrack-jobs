import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const nav = [
  ['Home', '/'],
  ['Latest Jobs', '/jobs'],
  ['Search', '/search'],
  ['For You', '/for-you'],
  ['About', '/about'],
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#f7f8f3] text-[#12231f]">
      <header className="sticky top-0 z-40 border-b border-[#163b31]/10 bg-[#f7f8f3]/92 backdrop-blur-xl">
        <div className="container flex h-18 items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Government Jobs Portal home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#123d31] font-serif text-lg font-bold text-white">GJ</span>
            <span>
              <strong className="block text-sm leading-tight">Government Jobs</strong>
              <span className="text-[10px] font-bold tracking-[.18em] text-[#b4522b]">OFFICIAL LINKS, CLEAR DETAILS</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {nav.map(([label, path]) => (
              <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end={path === '/'}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Link className="button-secondary" to="/saved-jobs">Saved</Link>
                <Link className="button-secondary" to="/profile">{user.name || 'Profile'}</Link>
                <button className="button-secondary" onClick={logout}>Logout</button>
              </>
            ) : <Link className="button-secondary" to="/login">Login</Link>}
          </div>
          <button className="button-secondary md:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation">
            Menu
          </button>
        </div>
        {open && (
          <nav className="container grid gap-1 border-t border-[#163b31]/10 py-3 md:hidden">
            {nav.map(([label, path]) => <NavLink key={path} to={path} onClick={() => setOpen(false)} className="nav-link">{label}</NavLink>)}
            {user ? (
              <>
                <NavLink to="/profile" className="nav-link">Profile</NavLink>
                <NavLink to="/saved-jobs" className="nav-link">Saved Jobs</NavLink>
                <button onClick={logout} className="nav-link text-left">Logout</button>
              </>
            ) : <NavLink to="/login" className="nav-link">Login</NavLink>}
          </nav>
        )}
      </header>
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 bg-[#0c2922] text-white">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl font-semibold">Government Jobs Portal</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
            A discovery portal for published government opportunities. Always verify dates and eligibility in the official notification.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#f5a36f]">Explore</p>
          <div className="mt-4 grid gap-2 text-sm text-white/70">
            <Link to="/jobs">Latest Jobs</Link><Link to="/search">Advanced Search</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#f5a36f]">Legal</p>
          <div className="mt-4 grid gap-2 text-sm text-white/70">
            <Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms</Link><Link to="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/45">Not an official government website.</div>
    </footer>
  );
}
