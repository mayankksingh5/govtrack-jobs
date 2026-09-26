import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function SearchBar({ initial = '' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initial);
  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };
  return (
    <form className="hero-search" role="search" onSubmit={submit}>
      <Icon name="search" size={24} />
      <label className="sr-only" htmlFor="hero-search">Search government jobs</label>
      <input
        id="hero-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search SBI PO, SSC CGL, Railway NTPC, UPSC..."
      />
      <button type="submit">Search</button>
    </form>
  );
}
