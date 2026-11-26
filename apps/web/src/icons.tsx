import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3.5l9 7V20a1.5 1.5 0 0 1-1.5 1.5H15v-6.5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6.5H4.5A1.5 1.5 0 0 1 3 20z" />,
  users: (
    <>
      <circle cx="9" cy="7.5" r="3.2" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="16.8" cy="8.5" r="2.4" />
      <path d="M16.5 14.7c2.4.4 4.5 2 4.5 4.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M7.5 19.5 3.5 21l1.1-3.8A8.5 8.5 0 1 1 12 20.5c-1.6 0-3.1-.4-4.5-1z" />,
  direct: (
    <>
      <path d="M21 4 3.5 10.7a.7.7 0 0 0 .1 1.3l6.8 2.4 2.4 6.8a.7.7 0 0 0 1.3.1z" />
      <path d="M21 4 10.4 14.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.2 4.1-4.8 7.5-4.8s6.1 1.6 7.5 4.8" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <polygon points="15.8,8.2 10.2,10.2 8.2,15.8 13.8,13.8" />
      <circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="13" rx="2.5" />
      <path d="M8.5 7.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M3 12.5h18" />
    </>
  ),
  bell: (
    <>
      <path d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4 18h16z" />
      <path d="M9.8 18.5a2.2 2.2 0 0 0 4.4 0" />
    </>
  ),
  back: <path d="m9 6 6 6-6 6" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </>
  ),
  heart: <path d="M12 20.5S4 15.4 4 9.3A4.6 4.6 0 0 1 8.6 4.7c1.6 0 2.7.8 3.4 1.9.7-1.1 1.8-1.9 3.4-1.9A4.6 4.6 0 0 1 20 9.3c0 6.1-8 11.2-8 11.2z" />,
  comment: <path d="M20.5 11.8a8.4 8.4 0 0 1-12.2 7.5L3.5 20.5l1.3-4.6A8.4 8.4 0 1 1 20.5 11.8z" />,
  share: (
    <>
      <path d="M14.5 5H19v4.5" />
      <path d="M19 5 11 13" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </>
  ),
  repost: (
    <>
      <path d="m17 3 3.5 3.5L17 10" />
      <path d="M4 11.5V9.5a3 3 0 0 1 3-3h13.5" />
      <path d="M7 21 3.5 17.5 7 14" />
      <path d="M20 12.5v2a3 3 0 0 1-3 3H3.5" />
    </>
  ),
  bookmark: <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.2 6.5 21z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  send: (
    <>
      <path d="M3.4 4.1 21 12 3.4 19.9a.7.7 0 0 1-.9-.8l1.7-5.6 8.3-1.5-8.3-1.5-1.7-5.6a.7.7 0 0 1 .9-.8z" />
    </>
  ),
  file: (
    <>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3.5V8h4.5" />
    </>
  ),
  paperclip: <path d="m20.5 11.2-8.4 8.4a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8" />,
  edit: (
    <>
      <path d="M12 20h8.5" />
      <path d="M16.2 3.8a2.1 2.1 0 0 1 3 3L7.3 18.7 3.5 19.8l1.1-3.8z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5h3.5l1.6-2.5h5.8l1.6 2.5H20a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 4 8.5z" />
      <circle cx="12" cy="14" r="3.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7 7.6 19.5a1 1 0 0 0 1 .9h6.8a1 1 0 0 0 1-.9L17.5 7" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4.2 4.2 0 0 0 6 .3l2.3-2.3a4.2 4.2 0 0 0-6-6L11 6.8" />
      <path d="M14 10.5a4.2 4.2 0 0 0-6-.3L5.7 12.5a4.2 4.2 0 0 0 6 6L13 17.2" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  verified: (
    <>
      <path d="M12 2.5 14.7 4l3-.2 1.1 2.8 2.5 1.7-.5 3 1.2 2.8-2 2.2.2 3-2.9.8-1.6 2.5-3-.6-2.7 1.3-2.7-1.3-3 .6-1.6-2.5-2.9-.8.2-3-2-2.2 1.2-2.8-.5-3 2.5-1.7L6.3 3.8l3 .2z" />
      <path d="m9.2 12.2 2 2 3.8-4" fill="none" stroke="#fff" strokeWidth="2" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8.5" r="5" />
      <path d="M8.5 12.5 7 21l5-2.5L17 21l-1.5-8.5" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 19.5A2.5 2.5 0 0 1 7 17h12.5" />
      <path d="M7 3h12.5v18H7a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 7 3z" />
    </>
  ),
  graduation: (
    <>
      <path d="m2 10 10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </>
  ),
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  external: (
    <>
      <path d="M15 3.5h5.5V9" />
      <path d="M10.5 13.5 20.5 3.5" />
      <path d="M18 13v5.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H11" />
    </>
  ),
  phone: <path d="M21.5 16.9v2.8a2 2 0 0 1-2.2 2 19.4 19.4 0 0 1-8.5-3 19.1 19.1 0 0 1-5.9-5.9A19.4 19.4 0 0 1 2 4.3 2 2 0 0 1 4 2.1h2.8a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L7.8 10a15.7 15.7 0 0 0 5.9 5.9l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9z" />,
  shield: (
    <>
      <path d="M12 3 4.5 6.3v5.4c0 5 3.2 9 7.5 10.3 4.3-1.3 7.5-5.3 7.5-10.3V6.3z" />
      <path d="m9.5 12.2 1.8 1.8 3.5-3.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 15-4.5-4.5a1.5 1.5 0 0 0-2.1 0L7 18" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="6" y="12" width="3" height="5" rx="1" />
      <rect x="10.5" y="7" width="3" height="10" rx="1" />
      <rect x="15" y="10" width="3" height="7" rx="1" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.7 4.1L18 8.8l-4.3 1.7L12 14.8l-1.7-4.3L6 8.8l4.3-1.7z" />
      <path d="M5 17l.8 1.9L7.7 19.7l-1.9.8L5 22.4l-.8-1.9-1.9-.8 1.9-.8z" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h2M13 9h2M9 13h2M13 13h2M10 20v-3h4v3" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 4v5a4 4 0 0 0 8 0V4" />
      <path d="M5 4h2M13 4h2" />
      <path d="M10 13v2a5 5 0 0 0 10 0v-2" />
      <circle cx="20" cy="11" r="1.8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M19 17h1" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  insights: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M8 16v-4.5M12 16V8.5M16 16v-6.5" />
    </>
  ),
  crown: <path d="M3.5 18.5h17l-1.3-9-4.2 3.5-3-5.5-3 5.5-4.2-3.5z" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5-9.5-6.5-9.5-6.5z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  trend: (
    <>
      <path d="m3.5 16.5 5.8-5.8 4 4L20.5 7.5" />
      <path d="M15.5 7.5h5v5" />
    </>
  ),
}

const filledPaths: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3.5l9 7V20a1.5 1.5 0 0 1-1.5 1.5H14.5v-6a1.5 1.5 0 0 0-1.5-1.5h-2a1.5 1.5 0 0 0-1.5 1.5v6H4.5A1.5 1.5 0 0 1 3 20z" />,
  users: (
    <>
      <circle cx="9" cy="7.5" r="3.4" />
      <path d="M2.5 20c0-3.2 2.9-5.3 6.5-5.3s6.5 2.1 6.5 5.3z" />
      <circle cx="17" cy="8.5" r="2.5" />
      <path d="M16.5 14.5c2.7.5 4.8 2.2 4.8 5.5H16.8c-.2-1.8-.9-3.6-2.1-4.8z" />
    </>
  ),
  briefcase: (
    <>
      <path d="M8.5 7.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <rect x="3" y="7.5" width="18" height="13" rx="2.5" />
      <path d="M3 12.5h18" fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="1.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7.8" r="3.8" />
      <path d="M4.2 20.5c1.3-3.6 4.2-5.3 7.8-5.3s6.5 1.7 7.8 5.3z" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <polygon points="16,8 10.2,10.2 8,16 13.8,13.8" fill="#fff" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  crown: <path d="M3.5 18.5h17l-1.3-9-4.2 3.5-3-5.5-3 5.5-4.2-3.5z" />,
}

const alwaysFilled = new Set(['more', 'verified', 'send'])

export function Icon({
  name,
  filled,
  mirror,
}: {
  name: keyof typeof paths | string
  filled?: boolean
  mirror?: boolean
}) {
  const isFilled = filled ?? alwaysFilled.has(name)
  const customFilled = isFilled ? filledPaths[name] : undefined
  const body = customFilled ?? paths[name]
  const isMirrored = mirror ?? name === 'send'

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled && customFilled ? 'none' : isFilled ? 'none' : 'currentColor'}
      strokeWidth={name === 'plus' ? 2.1 : 1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
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
