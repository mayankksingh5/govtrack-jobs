const iconPaths = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>),
  chevron: <path d="m8 10 4 4 4-4" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6" /></>),
  bookmark: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21Z" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  external: (<><path d="M14 5h5v5M19 5l-8 8" /><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>),
  file: (<><path d="M7 3h7l4 4v14H7Z" /><path d="M14 3v5h5M10 13h5M10 17h5" /></>),
  verified: (<><path d="M12 3.2 14 5l2.7-.1.5 2.6 2 1.8-1.4 2.3.5 2.7-2.5 1-1.3 2.4-2.5-.8-2.5.8-1.3-2.4-2.5-1 .5-2.7-1.4-2.3 2-1.8.5-2.6L10 5Z" /><path d="m9 11.5 2 2 4-4" /></>),
  calendar: (<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>),
  home: (<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>),
  briefcase: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V4h6v3M3 12h18" /></>),
  exam: (<><path d="M5 3h14v18H5Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>),
  trophy: (<><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6" /></>),
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  bell: <path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20h4" />,
  grid: (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>),
  bank: <path d="m3 9 9-5 9 5M5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 18h16M3 21h18" />,
  document: (<><path d="M6 3h9l3 3v15H6Z" /><path d="M14 3v4h4M9 11h6M9 15h6" /></>),
  teaching: (<><path d="m3 9 9-5 9 5-9 5Z" /><path d="M7 11v5c3 2 7 2 10 0v-5M21 9v6" /></>),
  train: (<><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M8 7h8M7 13h10M8 21l2-3M16 21l-2-3M9 15h.01M15 15h.01" /></>),
  shield: (<><path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6Z" /><path d="m9 12 2 2 4-4" /></>),
  government: <path d="m3 9 9-5 9 5M5 10h14M7 10v7M12 10v7M17 10v7M4 18h16M3 21h18" />,
  finance: (<><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m4 6 5-3 6 5 6-4" /></>),
  code: (<><rect x="3" y="4" width="18" height="14" rx="2" /><path d="m9 9-3 2.5L9 14M15 9l3 2.5-3 2.5M8 21h8" /></>),
  medical: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></>),
  police: (<><path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6Z" /><path d="m12 8 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 10.3l2-.3Z" /></>),
  engineering: (<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>),
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}
