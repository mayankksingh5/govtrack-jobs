import { Link } from 'react-router-dom';

export function OrganizationCard({ name, count }) {
  return <Link to={`/organization/${encodeURIComponent(name)}`} className="info-card"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#123d31] font-serif font-bold text-white">{name.slice(0, 2).toUpperCase()}</span><span><strong className="block">{name}</strong><span className="text-xs text-[#72807c]">{count} recent {count === 1 ? 'opening' : 'openings'}</span></span></Link>;
}

export function CategoryCard({ label, slug, description }) {
  return <Link to={`/category/${slug}`} className="info-card items-start"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#cf6638]" /><span><strong className="block">{label}</strong><span className="mt-1 block text-xs leading-5 text-[#72807c]">{description}</span></span></Link>;
}
