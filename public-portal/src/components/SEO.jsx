import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../api.js';

export default function SEO({ title, description, path = '/', type = 'website', schema }) {
  const fullTitle = title ? `${title} | Government Jobs Portal` : 'Government Jobs Portal';
  const canonical = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
}
