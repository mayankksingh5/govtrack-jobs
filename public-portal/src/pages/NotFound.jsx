import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';

export default function NotFound() {
  return (
    <main className="container not-found">
      <SEO title="Page Not Found" description="The requested page could not be found." path="/404" />
      <span>404 ERROR</span>
      <h1>Page not found</h1>
      <p>The page may have moved, or the address may be incorrect.</p>
      <Link className="button primary" to="/">Return home</Link>
    </main>
  );
}
