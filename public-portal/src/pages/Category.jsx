import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SEO from '../components/SEO.jsx';
import { EmptyState } from '../components/States.jsx';

const labels = { psu: 'PSU', ssc: 'SSC', upsc: 'UPSC', banking: 'Banking', railway: 'Railway', defence: 'Defence', teaching: 'Teaching', engineering: 'Engineering' };

export default function Category() {
  const { slug } = useParams();
  const label = labels[slug] || slug.replaceAll('-', ' ');
  return (
    <>
      <SEO title={`${label} Jobs`} description={`Browse current ${label} government job opportunities.`} path={`/category/${slug}`} />
      <div className="container py-10">
        <Breadcrumbs items={[{ label: 'Categories' }, { label }]} />
        <div className="page-heading"><p className="eyebrow">CATEGORY</p><h1>{label} Jobs</h1><p>Published opportunities in this recruitment sector.</p></div>
        <div className="panel mt-8"><EmptyState title="Data unavailable" description="The existing API does not expose sector taxonomy for PSU, SSC, UPSC, Banking, Railway, Defence, Teaching, or Engineering. No jobs are being inferred or hardcoded." /></div>
      </div>
    </>
  );
}
