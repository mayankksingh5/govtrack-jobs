import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#667771]">
      <Link to="/" className="hover:text-[#b4522b]">Home</Link>
      {items.map((item) => <span key={item.label} className="flex items-center gap-2"><span aria-hidden="true">/</span>{item.to ? <Link to={item.to} className="hover:text-[#b4522b]">{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}
    </nav>
  );
}
