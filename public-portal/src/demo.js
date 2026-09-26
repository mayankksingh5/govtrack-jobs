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

// Scraped records waiting for review, as the scraper stores them.
const pending = [
  { id: 101, source_id: 'ibps', source_name: 'IBPS', raw_title: 'CRP RRBs-XV Officers Scale I, II, III and Office Assistants Notification', url: 'https://www.ibps.in/wp-content/uploads/CRP-RRB-XV.pdf', type: 'job', first_seen_at: stamp(0) },
  { id: 102, source_id: 'rbi', source_name: 'RBI', raw_title: 'Recruitment of Assistant Manager (Rajbhasha) 2026', url: 'https://opportunities.rbi.org.in/Scripts/Vacancies.aspx', type: 'job', first_seen_at: stamp(-1) },
  { id: 103, source_id: 'isro', source_name: 'ISRO', raw_title: 'ISRO ICRB Scientist/Engineer SC Written Test Result', url: 'https://www.isro.gov.in/Careers.html', type: 'result', first_seen_at: stamp(-1) },
  { id: 104, source_id: 'sbi-careers', source_name: 'SBI', raw_title: 'Call Letter for Online Preliminary Exam - Junior Associates', url: 'https://sbi.bank.in/web/careers/current-openings', type: 'admit_card', first_seen_at: stamp(-2) },
].map((post) => ({ status: 'pending', important_links: [], updated_at: post.first_seen_at, ...post }));

const adminPosts = () => [
  ...pending,
  ...records.map((job) => ({ status: 'published', first_seen_at: job.published_at, url: job.important_links[0]?.url, ...job })),
];

const DEMO_ADMIN = { user_id: '00000000-0000-4000-8000-000000000001', name: 'Demo Admin', email: 'admin@example.com', role: 'admin' };

export const demoApi = {
  login: () => page([{ access_token: 'demo', expires_in: 3600 }]),
  logout: () => page([{ logged_out: true }]),
  refreshSession: () => page([{ access_token: 'demo', expires_in: 3600 }]),
  getProfile: () => page([DEMO_ADMIN]),
  getAdminSummary: () =>
    page([{
      by_status: { pending: pending.filter((post) => post.status === 'pending').length, published: records.length, rejected: 0 },
      sources: [
        { source_id: 'ibps', ok: true, links_found: 10, new_items: 1, ms: 2100, ran_at: stamp(0) },
        { source_id: 'sbi-careers', ok: true, links_found: 53, new_items: 1, ms: 3400, ran_at: stamp(0) },
        { source_id: 'isro', ok: true, links_found: 4, new_items: 1, ms: 1800, ran_at: stamp(0) },
        { source_id: 'nhpc', ok: false, links_found: 0, new_items: 0, error: 'HTTP 200 received but no jobs were extracted', ms: 900, ran_at: stamp(0) },
      ],
    }]),
  getAdminPosts: (params = {}) => {
    const status = params.status || 'pending';
    return page(adminPosts().filter((post) => post.status === status), params);
  },
  getAdminPost: (id) => {
    const post = adminPosts().find((item) => String(item.id) === String(id));
    if (!post) throw new Error('Post not found');
    return page([post], { limit: 1 });
  },
  updateAdminPost: (id, changes) => {
    const post = pending.find((item) => String(item.id) === String(id));
    if (post) Object.assign(post, changes);
    return page([{ ...(post || {}), ...changes, id }], { limit: 1 });
  },

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
};
