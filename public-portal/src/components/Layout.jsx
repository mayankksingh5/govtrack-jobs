import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { SECTOR_KEYS, SECTORS } from '../lib/sectors.js';
import Icon from './Icon.jsx';
import { SectorIcon } from './UI.jsx';

const NAV = [
  ['Home', '/'],
  ['Jobs', '/jobs'],
  ['Exams', '/exams'],
  ['Results', '/results'],
  ['Admit Cards', '/admit-cards'],
  ['Answer Key', '/answer-keys'],
  ['Cut Off', '/cut-off'],
  ['Exam Calendar', '/exam-calendar'],
  ['Syllabus', '/syllabus'],
];

function Logo() {
  return (
    <Link className="brand" to="/" aria-label="GovTrack Jobs home">
      <span className="brand-symbol"><span>G</span></span>
      <span className="brand-copy">
        <strong>GovTrack</strong>
        <small>JOBS &amp; EXAMS</small>
      </span>
    </Link>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const input = useRef(null);
  const [query, setQuery] = useState('');

  // ⌘K / Ctrl+K focuses the header search, as hinted by the design.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };
  return (
    <form className="header-search" role="search" onSubmit={submit}>
      <Icon name="search" size={18} />
      <input
        ref={input}
        aria-label="Search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search jobs, exams, organizations..."
      />
      <kbd>⌘ K</kbd>
    </form>
  );
}

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sectorsOpen, setSectorsOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setSectorsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="official-strip">
        <div className="container strip-inner">
          <span>Independent job information platform</span>
          <span className="verified-note">
            <Icon name="verified" size={14} /> Updates verified from official sources
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container header-main">
          <Logo />
          <HeaderSearch />
          <Link className="icon-button notification" to="/results" aria-label="Latest updates">
            <Icon name="bell" />
            <span />
          </Link>
          {/* The site is public; only editors sign in, so the account link shows for admins alone. */}
          {user?.role === 'admin' && (
            <Link className="profile-button" to="/admin">
              <span className="avatar"><Icon name="user" size={17} /></span>
              <span>Admin</span>
            </Link>
          )}
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Icon name="menu" />
          </button>
        </div>
        <nav className={`container nav ${mobileOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          <div className="nav-dropdown">
            <button
              className="nav-categories"
              onClick={() => setSectorsOpen((open) => !open)}
              aria-expanded={sectorsOpen}
            >
              <Icon name="grid" size={16} /> Categories <Icon name="chevron" size={15} />
            </button>
            {sectorsOpen && (
              <div className="sector-menu">
                {SECTOR_KEYS.map((sector) => (
                  <Link key={sector} className={`sector-${sector}`} to={`/category/${sector}`}>
                    <SectorIcon sector={sector} size={14} />
                    {SECTORS[sector].label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {NAV.map(([label, path]) => (
            <NavLink key={label} to={path} end={path === '/'}>{label}</NavLink>
          ))}
        </nav>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer>
      <div className="container">
        <Logo />
        <p>Independent information platform. Always verify details on the official website before applying.</p>
        <div>
          <nav className="footer-links" aria-label="Legal">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/disclaimer">Disclaimer</Link>
          </nav>
          <span>© {new Date().getFullYear()} GovTrack Jobs</span>
        </div>
      </div>
    </footer>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    ['home', 'Home', '/', (path) => path === '/'],
    ['briefcase', 'Jobs', '/jobs', (path) => path.startsWith('/jobs')],
    ['exam', 'Exams', '/exams', (path) => path.startsWith('/exam')],
    ['trophy', 'Results', '/results', (path) => path.startsWith('/results')],
    // The header search is hidden on phones, so search takes the last slot.
    ['search', 'Search', '/search', (path) => path.startsWith('/search')],
  ];
  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {items.map(([icon, label, to, isActive]) => (
        <Link key={label} to={to} className={isActive(pathname) ? 'active' : ''}>
          <Icon name={icon} size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="app-shell">
      <Header />
      <Outlet />
      <Footer />
      <BottomNav />
    </div>
  );
}
