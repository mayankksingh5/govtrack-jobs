import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SEO from '../components/SEO.jsx';

const content = {
  about: ['About', 'We make published government opportunities easier to discover while directing applicants to official notifications and application pages.', ['This portal is an independent information service.', 'Job records are sourced from published notices and remain subject to official confirmation.', 'Human review should be completed before records are published.']],
  contact: ['Contact', 'Questions, corrections, or feedback can be sent to the portal operator.', ['Configure an official support email before deployment.', 'Do not send application forms, identity documents, or payment information through this portal.']],
  privacy: ['Privacy Policy', 'This page explains the portal’s baseline privacy approach.', ['The public job browser does not require an account.', 'Hosting and analytics providers may process standard request metadata.', 'Do not submit sensitive personal information through public contact channels.']],
  terms: ['Terms of Use', 'Use of this portal is subject to these basic terms.', ['Information is provided for convenient discovery.', 'Users must verify all dates, fees, and eligibility with the recruiting organization.', 'Availability of third-party government websites is not guaranteed.']],
  disclaimer: ['Disclaimer', 'This is not an official government website.', ['The portal does not represent any government department or recruiting body.', 'Official notifications take precedence over every summary shown here.', 'The portal is not responsible for decisions made using outdated or incomplete information.']],
};

export default function StaticPage({ type }) {
  const [title, intro, paragraphs] = content[type];
  return (
    <>
      <SEO title={title} description={intro} path={`/${type}`} />
      <div className="container max-w-4xl py-10">
        <Breadcrumbs items={[{ label: title }]} />
        <article className="panel px-6 py-10 sm:px-12">
          <h1 className="font-serif text-4xl font-semibold">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#52645f]">{intro}</p>
          <div className="mt-8 space-y-5 leading-7 text-[#52645f]">{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </article>
      </div>
    </>
  );
}
