import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
  users: <><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7.5" r="3" /><path d="M20 19v-1a4 4 0 0 0-3-3.87" /><path d="M16 4.13a3 3 0 0 1 0 5.74" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M7 19 4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" />,
  user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 19.2c1.3-2.8 3.8-4.2 7-4.2s5.7 1.4 7 4.2" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  bell: <><path d="M18 16V10a6 6 0 1 0-12 0v6l-1.5 2h15z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  back: <path d="M9 6 15 12 9 18" />,
  more: <><circle cx="12" cy="6" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="18" r="1.4" /></>,
  heart: <path d="M12 20s-7-4.4-9.2-8.6C1 8.4 3 5 6.4 5 8.4 5 10 6.2 12 8.4 14 6.2 15.6 5 17.6 5 21 5 23 8.4 21.2 11.4 19 15.6 12 20 12 20z" />,
  comment: <path d="M6 18 3 20V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3z" />,
  share: <><path d="M14 7h5v5" /><path d="M19 7 11 15" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" /></>,
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z" />,
  check: <path d="m5 12 5 5 9-9" />,
  send: <path d="m4 12 16-8-4-5v6z" />,
  file: <><path d="M14 4h4v16H6V8h8z" /><path d="M14 4v4h4" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M4.9 6.5 6.3 7.9M17.7 16.1 19.1 17.5M3 12h2M19 12h2M4.9 17.5 6.3 16.1M17.7 7.9 19.1 6.5" /></>,
  camera: <><path d="M4 8h4l2-2h4l2 2h4v12H4z" /><circle cx="12" cy="13" r="3.2" /></>,
  link: <><path d="M10 13a4 4 0 0 0 5.7.3l2.5-2.5a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 11a4 4 0 0 0-5.7-.3L5.8 13.2a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
}

const filled = new Set(['heart', 'comment', 'bookmark', 'more'])

export function Icon({ name }: { name: keyof typeof paths | string }) {
  const body = paths[name]
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={filled.has(name) ? 'currentColor' : 'none'} stroke={filled.has(name) ? 'none' : 'currentColor'} strokeWidth={name === 'plus' ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      {body}
    </svg>
  )
}

export function Brand() {
  return (
    <span className="brand" aria-label="طبیار">
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path fill="#12A8A8" d="M8 12.5c0-3.2 2.2-6.5 7-6.5h.2c.7 0 1.2.5 1.2 1.2s-.5 1.3-1.2 1.3H15c-2.7 0-4.3 1.7-4.3 4v6.2c0 3 1.8 5.3 5.5 5.3h5.2c.7 0 1.3.5 1.3 1.2s-.6 1.3-1.3 1.3h-5.2C9.4 26.5 6 23.2 6 18.5v-6z" />
        <path fill="#2F6FED" d="M17.3 6.5h6.2C27.4 6.5 30 9.3 30 13.5v5c0 3.2-2.2 6.5-7 6.5h-.3c-.7 0-1.2-.6-1.2-1.3s.5-1.2 1.2-1.2h.3c2.7 0 4.3-1.7 4.3-4v-5c0-3-1.8-5.3-5.5-5.3h-5c-.7 0-1.3-.5-1.3-1.2s.6-1.3 1.3-1.3z" />
        <circle cx="13.2" cy="16" r="2.15" fill="#FF8070" />
      </svg>
      <span>طبیار</span>
    </span>
  )
}
