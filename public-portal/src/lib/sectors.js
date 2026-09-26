/*
  Central sector configuration. Every component reads sector labels, icons
  and descriptions from here; the matching colours live as `--sector-*`
  tokens in styles.css and are applied through the `sector-<key>` class.
  Sector colour is deliberately independent from recruitment status colour.
*/
export const SECTORS = {
  banking: { label: 'Banking', icon: 'bank', description: 'Government & Banking Jobs' },
  ssc: { label: 'SSC', icon: 'document', description: 'SSC Exams & Recruitment' },
  teaching: { label: 'Teaching', icon: 'teaching', description: 'Teaching Jobs & Exams' },
  railway: { label: 'Railway', icon: 'train', description: 'Railway Recruitment' },
  defence: { label: 'Defence', icon: 'shield', description: 'Defence Jobs' },
  upsc: { label: 'UPSC', icon: 'government', description: 'Civil Services & National Exams' },
  finance: { label: 'Finance', icon: 'finance', description: 'Financial Institutions' },
  csit: { label: 'CS / IT', icon: 'code', description: 'Technology & Digital Roles' },
  medical: { label: 'Medical', icon: 'medical', description: 'Healthcare Recruitment' },
  police: { label: 'Police', icon: 'police', description: 'Police & Public Safety' },
  engineering: { label: 'Engineering', icon: 'engineering', description: 'Engineering Services' },
  state: { label: 'State Government', icon: 'government', description: 'State Government Roles' },
  other: { label: 'Other', icon: 'briefcase', description: 'Other Government Exams' },
};

export const SECTOR_KEYS = Object.keys(SECTORS);

// Hero chips and the category-page sector switcher.
export const POPULAR_SECTORS = ['banking', 'ssc', 'railway', 'defence', 'teaching', 'upsc', 'finance', 'csit'];

// "Explore by sector" cards on the home page.
export const HOME_SECTORS = ['banking', 'ssc', 'teaching', 'railway', 'defence', 'finance'];

/*
  Posts do not store a sector yet, so it is inferred from the organization,
  source and title. Order matters: e.g. "UPSC NDA" is Defence and
  "SSC GD Constable" is SSC, so those rules run before UPSC and Police.
  A stored `sector` value always wins once the database provides one.
*/
const RULES = [
  ['ssc', /\bssc\b|staff selection/],
  ['railway', /\brrb\b|\brrc\b|railway|\bmetro rail/],
  ['defence', /\barmy\b|\bnavy\b|air force|afcat|\bnda\b|\bcds\b|agniveer|drdo|defence|coast guard/],
  ['police', /police|constable|\bcapf\b|\bbsf\b|\bcrpf\b|\bcisf\b|\bitbp\b|\bssb\b|assam rifles/],
  ['upsc', /\bupsc\b|union public service|civil services/],
  ['banking', /\bibps\b|\bsbi\b|state bank|\brbi\b|reserve bank|\bnabard\b|\bsidbi\b|\bbank\b/],
  ['finance', /\bsebi\b|\blic\b|insurance|\birdai\b|\bpfrda\b|finance|\bexim\b/],
  ['state', /\b(uppsc|upsssc|bpsc|bssc|rpsc|rsmssb|mppsc|mpesb|hpsc|hssc|tnpsc|kpsc|appsc|tspsc|opsc|wbpsc|gpsc|mpsc|jkssb|psc)\b|state government|state public service/],
  ['teaching', /teacher|teaching|\bkvs\b|\bnvs\b|\bctet\b|\btet\b|b\.ed|professor|lecturer|\bschool|\bugc\b|\bcbse\b/],
  ['medical', /\baiims\b|medical|nurs(e|ing)|\bhealth|hospital|\besic\b|pharmac|\bdoctor/],
  ['csit', /\bnic\b|informatics|c-?dac|software|computer|cyber|\bit officer|data entry/],
  ['engineering', /\bisro\b|\bbel\b|bharat electronics|\bnhpc\b|\bntpc\b|\bbhel\b|\bgail\b|\bongc\b|\biocl\b|powergrid|\bhal\b|\bbarc\b|engineer/],
];

const match = (...parts) => {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  return RULES.find(([, pattern]) => pattern.test(text))?.[0];
};

/* The recruiting organization and title decide first; the scraper source is
   only a fallback (e.g. Delhi Police posts published on the SSC site). */
export function sectorOf(job = {}) {
  if (job.sector && SECTORS[job.sector]) return job.sector;
  return (
    match(job.organization, job.title, job.raw_title, job.post_name) ||
    match(job.source_name) ||
    'other'
  );
}

export const isSector = (key) => Object.hasOwn(SECTORS, key);
