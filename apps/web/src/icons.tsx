import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
  users: <><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7.5" r="3" /><path d="M20 19v-1a4 4 0 0 0-3-3.87" /><path d="M16 4.13a3 3 0 0 1 0 5.74" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M7 19 4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" />,
  user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 19.2c1.3-2.8 3.8-4.2 7-4.2s5.7 1.4 7 4.2" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  explore: <><circle cx="12" cy="12" r="9" /><path d="m16 8-8 8M8 8h8v8" /></>,
  briefcase: <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  bell: <><path d="M18 16V10a6 6 0 1 0-12 0v6l-1.5 2h15z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  back: <path d="M9 6 15 12 9 18" />,
  more: <><circle cx="12" cy="6" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="18" r="1.4" /></>,
  heart: <path d="M12 20s-7-4.4-9.2-8.6C1 8.4 3 5 6.4 5 8.4 5 10 6.2 12 8.4 14 6.2 15.6 5 17.6 5 21 5 23 8.4 21.2 11.4 19 15.6 12 20 12 20z" />,
  comment: <path d="M6 18 3 20V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3z" />,
  share: <><path d="M14 7h5v5" /><path d="M19 7 11 15" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" /></>,
  repost: <><path d="M17 2.5 21 6.5 17 10.5" /><path d="M3 12.5V10a4 4 0 0 1 4-4h14" /><path d="M7 21.5 3 17.5 7 13.5" /><path d="M21 11.5V14a4 4 0 0 1-4 4H3" /></>,
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z" />,
  check: <path d="m5 12 5 5 9-9" />,
  send: <><path d="M21 4 11.5 13.5" /><path d="M21 4 14 21l-2.5-7.5L4 11z" /></>,
  file: <><path d="M14 4h4v16H6V8h8z" /><path d="M14 4v4h4" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M4.9 6.5 6.3 7.9M17.7 16.1 19.1 17.5M3 12h2M19 12h2M4.9 17.5 6.3 16.1M17.7 7.9 19.1 6.5" /></>,
  camera: <><path d="M4 8h4l2-2h4l2 2h4v12H4z" /><circle cx="12" cy="13" r="3.2" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M7 7l1 13h8l1-13" /></>,
  link: <><path d="M10 13a4 4 0 0 0 5.7.3l2.5-2.5a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 11a4 4 0 0 0-5.7-.3L5.8 13.2a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  verified: <><path d="M12 2.5 14.7 4l3-.2 1.1 2.8 2.5 1.7-.5 3 1.2 2.8-2 2.2.2 3-2.9.8-1.6 2.5-3-.6-2.7 1.3-2.7-1.3-3 .6-1.6-2.5-2.9-.8.2-3-2-2.2 1.2-2.8-.5-3 2.5-1.7L6.3 3.8l3 .2z" /><path d="m9.2 12.2 2 2 3.8-4" fill="none" stroke="#fff" strokeWidth="2" /></>,
  mapPin: <><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  award: <><circle cx="12" cy="8.5" r="5" /><path d="M8.5 12.5 7 21l5-2.5L17 21l-1.5-8.5" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  graduation: <><path d="m2 10 10-5 10 5-10 5z" /><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></>,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  external: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7A2 2 0 0 1 22 16.9z" />,
  shield: <><path d="M12 3 4 6.5v5.5c0 5 3.4 9.3 8 10.5 4.6-1.2 8-5.5 8-10.5V6.5z" /><path d="m9.5 12.2 1.8 1.8 3.5-3.8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m21 15-4.5-4.5a1.5 1.5 0 0 0-2.1 0L7 18" /></>,
  xCircle: <><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></>,
  chart: <><path d="M4 20h16" /><rect x="6" y="12" width="3" height="5" rx="1" /><rect x="10.5" y="7" width="3" height="10" rx="1" /><rect x="15" y="10" width="3" height="7" rx="1" /></>,
  sparkles: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9z" /></>,
  building: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h2M13 9h2M9 13h2M13 13h2M10 20v-3h4v3" /></>,
  stethoscope: <><path d="M6 4v5a4 4 0 0 0 8 0V4" /><path d="M5 4h2M13 4h2" /><path d="M10 13v2a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="11" r="1.8" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M19 17h1" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="17" cy="17" r="2" /></>,
}

const alwaysFilled = new Set(['more', 'verified'])

export function Icon({ name, filled }: { name: keyof typeof paths | string; filled?: boolean }) {
  const body = paths[name]
  const isFilled = filled ?? alwaysFilled.has(name)
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={isFilled ? 'currentColor' : 'none'} stroke={isFilled ? 'none' : 'currentColor'} strokeWidth={name === 'plus' ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {body}
    </svg>
  )
}

export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={size === 'lg' ? 'brand brand-lg' : 'brand'} aria-label="طبیار">
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path fill="#12A8A8" d="M8 12.5c0-3.2 2.2-6.5 7-6.5h.2c.7 0 1.2.5 1.2 1.2s-.5 1.3-1.2 1.3H15c-2.7 0-4.3 1.7-4.3 4v6.2c0 3 1.8 5.3 5.5 5.3h5.2c.7 0 1.3.5 1.3 1.2s-.6 1.3-1.3 1.3h-5.2C9.4 26.5 6 23.2 6 18.5v-6z" />
        <path fill="#2F6FED" d="M17.3 6.5h6.2C27.4 6.5 30 9.3 30 13.5v5c0 3.2-2.2 6.5-7 6.5h-.3c-.7 0-1.2-.6-1.2-1.3s.5-1.2 1.2-1.2h.3c2.7 0 4.3-1.7 4.3-4v-5c0-3-1.8-5.3-5.5-5.3h-5c-.7 0-1.3-.5-1.3-1.2s.6-1.3 1.3-1.3z" />
        <circle cx="13.2" cy="16" r="2.15" fill="#FF8070" />
      </svg>
      <span>طبیار</span>
    </span>
  )
}
