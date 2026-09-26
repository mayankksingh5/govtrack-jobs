/*
  Local preview data. Loaded only by `npm run dev` with VITE_DEMO_DATA=true
  (see api.js); production builds never include this module.
  Dates are relative to today so every status (Active, Closing Soon,
  Upcoming, Admit Card, Result…) is always visible.
*/
const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const stamp = (offset) => `${day(offset)}T09:30:00.000Z`;
const links = (site, extra = []) => [
  ...extra,
  { label: 'Notification PDF', url: `${site}notification.pdf` },
  { label: 'Official website', url: site },
];

const records = [
  { id: 1, type: 'job', title: 'IBPS PO / MT XV Recruitment', organization: 'IBPS', source_name: 'IBPS', post_name: 'Probationary Officer / Management Trainee', total_vacancy: 5208, qualification: 'Any Graduate', age_limit: '20–30 years', fee_info: '₹850 (SC/ST/PwBD: ₹175)', apply_start: day(-12), last_date: day(16), exam_date: day(40), short_info: 'IBPS has invited online applications for recruitment of Probationary Officers and Management Trainees in participating public sector banks.', important_links: links('https://www.ibps.in/', [{ label: 'Apply online', url: 'https://ibpsonline.ibps.in/' }]) },
  { id: 2, type: 'job', title: 'Railway NTPC Graduate Level', organization: 'RRB', source_name: 'RRB', post_name: 'Station Master, Goods Guard, Clerk', total_vacancy: 8113, qualification: 'Graduate', age_limit: '18–36 years', apply_start: day(-20), last_date: day(3), exam_date: day(70), short_info: 'Railway Recruitment Boards have notified graduate-level Non-Technical Popular Categories posts across zones.', important_links: links('https://www.rrbapply.gov.in/', [{ label: 'Apply online', url: 'https://www.rrbapply.gov.in/' }]) },
  { id: 3, type: 'job', title: 'Combined Graduate Level 2026', organization: 'Staff Selection Commission', source_name: 'SSC', total_vacancy: 14582, qualification: "Bachelor's Degree", age_limit: '18–32 years', apply_start: day(-5), last_date: day(22), exam_date: day(55), important_links: links('https://ssc.gov.in/', [{ label: 'Apply online', url: 'https://ssc.gov.in/' }]) },
  { id: 4, type: 'job', title: 'SBI Clerk 2026', organization: 'State Bank of India', source_name: 'SBI', qualification: 'Any Graduate', apply_start: day(18), important_links: links('https://sbi.bank.in/web/careers/') },
  { id: 5, type: 'admit_card', title: 'NDA & NA Examination II Admit Card', organization: 'UPSC NDA', source_name: 'UPSC', total_vacancy: 406, qualification: '12th Pass', exam_date: day(9), important_links: links('https://upsc.gov.in/') },
  { id: 6, type: 'result', title: 'RBI Grade B Phase II Result', organization: 'Reserve Bank of India', source_name: 'RBI', total_vacancy: 94, qualification: 'Graduate', important_links: links('https://opportunities.rbi.org.in/') },
  { id: 7, type: 'job', title: 'KVS Teaching Recruitment 2026', organization: 'Kendriya Vidyalaya Sangathan', source_name: 'KVS', total_vacancy: 6129, qualification: 'B.Ed / Postgraduate', age_limit: 'Up to 35 years', apply_start: day(-3), last_date: day(28), exam_date: day(60), important_links: links('https://kvsangathan.nic.in/', [{ label: 'Apply online', url: 'https://kvsangathan.nic.in/' }]) },
  { id: 8, type: 'job', title: 'SEBI Grade A Officer', organization: 'SEBI', source_name: 'SEBI', total_vacancy: 97, qualification: 'Graduate / CA', apply_start: day(10), last_date: day(31), exam_date: day(50), important_links: links('https://www.sebi.gov.in/') },
  { id: 9, type: 'result', title: 'UPSC Civil Services Prelims Result', organization: 'UPSC', source_name: 'UPSC', total_vacancy: 979, qualification: 'Any Graduate', important_links: links('https://upsc.gov.in/') },
  { id: 10, type: 'job', title: 'NIC Scientific Officer Recruitment', organization: 'National Informatics Centre', source_name: 'NIC', total_vacancy: 312, qualification: 'B.E / B.Tech / MCA', apply_start: day(25), important_links: links('https://www.nic.in/') },
  { id: 11, type: 'admit_card', title: 'SSC CGL Tier I City Slip', organization: 'SSC', source_name: 'SSC', exam_date: day(14), important_links: links('https://ssc.gov.in/') },
  { id: 12, type: 'result', title: 'CTET July Result', organization: 'CBSE CTET', source_name: 'CBSE', qualification: 'B.Ed / D.El.Ed', important_links: links('https://ctet.nic.in/') },
  { id: 13, type: 'answer_key', title: 'SSC GD Constable Answer Key', organization: 'SSC', source_name: 'SSC', important_links: links('https://ssc.gov.in/') },
  { id: 14, type: 'job', title: 'ISRO Scientist / Engineer SC', organization: 'ISRO', source_name: 'ISRO', total_vacancy: 63, qualification: 'B.E / B.Tech', apply_start: day(-8), last_date: day(1), exam_date: day(45), important_links: links('https://www.isro.gov.in/Careers.html', [{ label: 'Apply online', url: 'https://www.isro.gov.in/Careers.html' }]) },
  { id: 15, type: 'job', title: 'Delhi Police Constable Recruitment', organization: 'Delhi Police', source_name: 'SSC', total_vacancy: 7547, qualification: '12th Pass', age_limit: '18–25 years', apply_start: day(-2), last_date: day(26), exam_date: day(80), important_links: links('https://ssc.gov.in/') },
  { id: 16, type: 'job', title: 'AIIMS Nursing Officer (NORCET)', organization: 'AIIMS', source_name: 'AIIMS', total_vacancy: 3055, qualification: 'B.Sc Nursing', apply_start: day(-15), last_date: day(6), exam_date: day(35), important_links: links('https://www.aiimsexams.ac.in/', [{ label: 'Apply online', url: 'https://www.aiimsexams.ac.in/' }]) },
].map((job, index) => ({
  source_id: job.source_name.toLowerCase(),
  raw_title: job.title,
  published_at: stamp(-index),
  updated_at: stamp(-index),
  ...job,
}));

const page = (list, { page: pageNo = 1, limit = 20 } = {}) => {
  const current = Number(pageNo) || 1;
  const size = Number(limit) || 20;
  return {
    success: true,
    total: list.length,
    page: current,
    pages: Math.ceil(list.length / size),
    data: list.slice((current - 1) * size, current * size),
  };
};

export const demoApi = {
  getJobs: (params = {}) =>
    page(
      records.filter(
        (job) =>
          (!params.category || job.type === params.category) &&
          (!params.organization || job.organization.toLowerCase().includes(params.organization.toLowerCase()))
      ),
      params
    ),
  searchJobs: (params = {}) => {
    const q = String(params.q || '').toLowerCase();
    return page(records.filter((job) => [job.title, job.organization, job.post_name].join(' ').toLowerCase().includes(q)), params);
  },
  getLatest: (limit = 12) => page(records, { limit }),
  getJob: (id) => {
    const job = records.find((item) => String(item.id) === String(id));
    if (!job) throw new Error('Job not found');
    return page([job], { limit: 1 });
  },
  getStatistics: () => page([{ published_jobs: records.length, by_category: {} }]),
  getRecommendations: (params = {}) =>
    page(records.map((job) => ({ ...job, recommendation_score: 60, recommendation_reasons: [{ factor: 'recency' }] })), params),
};
