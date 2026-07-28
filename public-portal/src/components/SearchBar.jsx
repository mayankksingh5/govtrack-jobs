import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ initial = '', compact = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initial);
  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  };
  return (
    <form onSubmit={submit} role="search" className={`flex gap-2 rounded-2xl border border-[#153c31]/15 bg-white p-2 shadow-xl shadow-[#153c31]/8 ${compact ? '' : 'mx-auto max-w-3xl'}`}>
      <label className="sr-only" htmlFor={compact ? 'compact-search' : 'hero-search'}>Search government jobs</label>
      <input id={compact ? 'compact-search' : 'hero-search'} className="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none placeholder:text-[#89948f] focus:ring-2 focus:ring-[#c96337]/30" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by post, organization, or qualification…" />
      <button className="button" type="submit">Search</button>
    </form>
  );
}
