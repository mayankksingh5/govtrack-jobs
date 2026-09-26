import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SEO from '../components/SEO.jsx';

const content = {
  about: ['About', 'GovTrack Jobs brings government job notifications, admit cards, results and exam dates together in one place, with a direct link to the official source for every update.', ['GovTrack Jobs is an independent information service and is not affiliated with any government department or recruiting body.', 'Updates are collected from official websites and notifications, and reviewed before publication.', 'Always confirm dates, fees and eligibility in the official notification before applying.']],
  contact: ['Contact', 'Questions, corrections, or feedback can be sent to the GovTrack Jobs team.', ['If you spot an incorrect date or broken link, tell us which update it is so we can check it against the official source.', 'Do not send application forms, identity documents, or payment information through this website.']],
  privacy: ['Privacy Policy', 'This page explains how GovTrack Jobs handles your information.', ['GovTrack Jobs is free to use without an account, and we do not ask visitors for personal details.', 'Hosting and analytics providers may process standard request metadata such as IP address and browser type.', 'Do not submit sensitive personal information through public contact channels.']],
  terms: ['Terms of Use', 'Use of GovTrack Jobs is subject to these terms.', ['Information is provided to make government opportunities easier to discover.', 'You must verify all dates, fees, and eligibility with the recruiting organization.', 'Availability of third-party government websites is not guaranteed.']],
  disclaimer: ['Disclaimer', 'GovTrack Jobs is not an official government website.', ['GovTrack Jobs does not represent any government department or recruiting body and does not conduct any recruitment.', 'Official notifications take precedence over every summary shown here.', 'GovTrack Jobs is not responsible for decisions made using outdated or incomplete information.']],
};

export default function StaticPage({ type }) {
  const [title, intro, paragraphs] = content[type];
  return (
    <main className="listing-page">
      <SEO title={title} description={intro} path={`/${type}`} />
      <div className="container">
        <Breadcrumbs items={[{ label: title }]} />
        <article className="prose-card">
          <span>GOVTRACK JOBS</span>
          <h1>{title}</h1>
          <p className="lead">{intro}</p>
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
      </div>
    </main>
  );
}
