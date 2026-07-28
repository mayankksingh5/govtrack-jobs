import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" description="The requested page could not be found." path="/404" />
      <div className="container py-24 text-center"><p className="eyebrow">404 ERROR</p><h1 className="mt-4 font-serif text-6xl font-semibold">Page not found.</h1><p className="mx-auto mt-4 max-w-md text-[#667771]">The page may have moved, or the address may be incorrect.</p><Link className="button mt-8" to="/">Return home</Link></div>
    </>
  );
}
