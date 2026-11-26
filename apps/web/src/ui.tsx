import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type TouchEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api, assetUrl, when } from './api'
import { useImpression, type ImpressionSource } from './impressions'
import type { Post, UserCard } from './types'
import { Brand, Icon } from './icons'

const fa = new Intl.NumberFormat('fa-IR')

const covers: Record<string, string> = {
  'sara-karimi': '/design/photo-courtyard.jpg',
  'mohammad-rezaei': '/design/photo-courtyard.jpg',
  'ali-ahmadi': '/design/story-mohammad.jpg',
  niloufar: '/design/story-niloufar.jpg',
}

const portraits: Record<string, string> = {
  'sara-karimi': '/design/avatar-sara.png',
  'mohammad-rezaei': '/design/avatar-mohammad.png',
  'ali-ahmadi': '/design/avatar-navid.png',
  niloufar: '/design/avatar-pouria.png',
  kasra: '/design/avatar-kaveh.png',
}

/* ---------------- Toast System ---------------- */
type ToastKind = 'info' | 'success' | 'error'
type ToastItem = { id: number; text: string; kind: ToastKind }
type ToastApi = { show: (text: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastApi>({ show: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((rows) => [...rows.slice(-2), { id, text, kind }])
    window.setTimeout(() => {
      setItems((rows) => rows.filter((item) => item.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                className={`toast-item is-${item.kind}`}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              >
                <Icon name={item.kind === 'error' ? 'xCircle' : item.kind === 'success' ? 'check' : 'sparkles'} />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  return useContext(ToastContext)
}

/* ---------------- Primitives ---------------- */
export function Button({
  variant = 'ghost',
  size = 'md',
  block = false,
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'gradient' | 'teal' | 'danger'
  size?: 'md' | 'sm'
  block?: boolean
  loading?: boolean
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    loading ? 'is-loading' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  counter,
  children,
}: {
  label?: string
  htmlFor?: string
  help?: string
  error?: string
  counter?: string
  children: ReactNode
}) {
  return (
    <div className={error ? 'field is-error' : 'field'}>
      {(label || counter) && (
        <div className="field-head">
          {label ? <label htmlFor={htmlFor}>{label}</label> : <span />}
          {counter && <span className="field-count">{counter}</span>}
        </div>
      )}
      {children}
      {help && !error && <p className="help">{help}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

export function latinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  hasError = false,
  length = 5,
}: {
  value: string
  onChange: (next: string) => void
  onComplete?: (code: string) => void
  hasError?: boolean
  length?: number
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, idx) => value[idx] ?? '')

  const emit = (nextChars: string[]) => {
    const joined = nextChars.join('').slice(0, length)
    onChange(joined)
    if (joined.length === length) onComplete?.(joined)
  }

  const handleChange = (index: number, raw: string) => {
    const clean = latinDigits(raw).replace(/\D/g, '')
    if (!clean) {
      const copy = [...digits]
      copy[index] = ''
      emit(copy)
      return
    }
    if (clean.length > 1) {
      const next = clean.slice(0, length).split('')
      while (next.length < length) next.push('')
      emit(next)
      const focusIdx = Math.min(clean.length, length - 1)
      refs.current[focusIdx]?.focus()
      return
    }
    const copy = [...digits]
    copy[index] = clean
    emit(copy)
    if (index < length - 1) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = latinDigits(event.clipboardData.getData('text')).replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    event.preventDefault()
    const next = pasted.split('')
    while (next.length < length) next.push('')
    emit(next)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <motion.div
      className={hasError ? 'otp-boxes is-error' : 'otp-boxes'}
      animate={hasError ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { refs.current[index] = el }}
          className={digit ? 'otp-box is-filled' : 'otp-box'}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          aria-label={`رقم ${index + 1}`}
          value={digit}
          autoFocus={index === 0 && !value}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </motion.div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'seg-pill',
  ariaLabel,
  className = '',
}: {
  options: { value: T; label: string; icon?: string }[]
  value: T
  onChange: (next: T) => void
  layoutId?: string
  ariaLabel?: string
  className?: string
}) {
  return (
    <div
      className={`segmented ${className}`.trim()}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? 'seg-btn is-on' : 'seg-btn'}
            onClick={() => onChange(opt.value)}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="seg-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {opt.icon && <Icon name={opt.icon} />}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ConfirmSheet({
  open,
  title,
  text,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} front>
      <div className="stack">
        <h2>{title}</h2>
        <p className="muted center" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{text}</p>
        <div className="two" style={{ marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Sheet>
  )
}

export function Sheet({
  open = true,
  onClose,
  children,
  front = false,
}: {
  open?: boolean
  onClose: () => void
  children: ReactNode
  front?: boolean
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={front ? 'overlay overlay-front' : 'overlay'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 260 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 450) onClose()
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="sheet-handle" aria-hidden="true" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------------- Media & Cards ---------------- */
export function postCover(post: Post): string | undefined {
  const own = post.media[0]?.url
    ? assetUrl(post.media[0].url)
    : (post.is_demo ? covers[post.author.slug || ''] : undefined)
  if (own) return own
  if (post.repost_of) return postCover(post.repost_of)
  return undefined
}

export function MediaCarousel({ post, className = '' }: { post: Post; className?: string }) {
  const cover = postCover(post)
  const slides = post.media.length > 0
    ? post.media
    : cover
      ? [{ url: cover, kind: 'image' as const }]
      : []
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)

  if (slides.length === 0) return null

  const onTouchStart = (event: TouchEvent) => { touchStart.current = event.touches[0]?.clientX ?? null }
  const onTouchEnd = (event: TouchEvent) => {
    if (touchStart.current == null) return
    const delta = event.changedTouches[0]?.clientX - touchStart.current
    if (Math.abs(delta) < 40) return
    if (delta < 0) setIndex((i) => Math.min(i + 1, slides.length - 1))
    else setIndex((i) => Math.max(i - 1, 0))
    touchStart.current = null
  }

  return (
    <div className={`media-carousel ${className}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {slides.map((slide, i) => (
        slide.kind === 'video'
          ? <video key={i} className="media-natural" src={assetUrl(slide.url)} controls playsInline hidden={i !== index} />
          : <img key={i} className="media-natural" src={assetUrl(slide.url)} alt="" decoding="async" hidden={i !== index} />
      ))}
      {slides.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              className="media-nav media-nav--prev"
              aria-label="اسلاید قبلی"
              onClick={(event) => { event.stopPropagation(); setIndex((i) => Math.max(0, i - 1)) }}
            >
              <Icon name="chevronRight" />
            </button>
          )}
          {index < slides.length - 1 && (
            <button
              type="button"
              className="media-nav media-nav--next"
              aria-label="اسلاید بعدی"
              onClick={(event) => { event.stopPropagation(); setIndex((i) => Math.min(slides.length - 1, i + 1)) }}
            >
              <Icon name="chevronLeft" />
            </button>
          )}
          <div className="media-dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={i === index ? 'dot is-on' : 'dot'} aria-label={`اسلاید ${i + 1}`} onClick={(event) => { event.stopPropagation(); setIndex(i) }} />
            ))}
          </div>
          <span className="media-count">{fa.format(index + 1)}/{fa.format(slides.length)}</span>
        </>
      )}
    </div>
  )
}

export function ListSkel({ rows = 6 }: { rows?: number }) {
  return (
    <div className="list-skel" aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="list-row list-row-skel">
          <span className="skel skel-avatar" />
          <div className="meta" style={{ flex: 1 }}>
            <span className="skel skel-line" style={{ width: '40%' }} />
            <span className="skel skel-line" style={{ width: '70%', marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Avatar({
  user,
  large = false,
  small = false,
}: {
  user: Pick<UserCard, 'name' | 'avatar_url' | 'slug'>
  large?: boolean
  small?: boolean
}) {
  const cls = large ? 'avatar lg' : small ? 'avatar sm' : 'avatar'
  const src = assetUrl(user.avatar_url) || (user.slug ? portraits[user.slug] : undefined)
  if (src) return <img className={cls} src={src} alt="" />
  return <span className={cls} style={{ display: 'grid', placeItems: 'center', fontWeight: 700 }}>{user.name.trim().charAt(0)}</span>
}

export function MentionBox({
  value,
  onChange,
  placeholder,
  multiline = false,
  className = 'input',
  inputRef,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const [hits, setHits] = useState<UserCard[]>([])
  const token = value.match(/@([^\s@]*)$/)?.[1]

  useEffect(() => {
    if (!token) {
      setHits([])
      return
    }
    const timer = window.setTimeout(() => {
      void api<{ doctors: UserCard[] }>(`/search?q=${encodeURIComponent(token)}`)
        .then((payload) => setHits(payload.doctors.slice(0, 6)))
        .catch(() => setHits([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [token])

  const pick = (person: UserCard) => {
    if (!person.slug) return
    onChange(value.replace(/@([^\s@]*)$/, `@${person.slug} `))
    setHits([])
  }

  return (
    <div className="mention-box">
      {hits.length > 0 && (
        <div className="mention-list" role="listbox">
          {hits.map((person) => (
            <button key={person.id} type="button" className="mention-hit" onClick={() => pick(person)}>
              <Avatar user={person} small />
              <span>{person.name}</span>
            </button>
          ))}
        </div>
      )}
      {multiline
        ? <textarea className={className} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        : <input ref={inputRef} className={className} value={value} placeholder={placeholder} aria-label={placeholder} autoComplete="off" onChange={(event) => onChange(event.target.value)} />}
    </div>
  )
}

export function VerifiedSeal({ user }: { user: Pick<UserCard, 'badges'> }) {
  if (!(user.badges.identity || user.badges.license)) return null
  return (
    <span className="verified-badge" title="احراز هویت شده" aria-label="احراز هویت شده">
      <Icon name="verified" />
    </span>
  )
}

export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[a-z0-9][a-z0-9_-]*|#[\p{L}\p{N}_-]+)/giu)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          return <Link key={index} className="mention" to={`/doctors/${part.slice(1)}`} onClick={(e) => e.stopPropagation()}>{part}</Link>
        }
        if (part.startsWith('#')) {
          return <Link key={index} className="hashtag" to="/explore" onClick={(e) => e.stopPropagation()}>{part}</Link>
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

export function Badges({ user }: { user: UserCard }) {
  if (user.badges.education && !user.badges.license) {
    return <span className="chips"><span className="chip chip-violet"><Icon name="check" /> هویت تحصیلی</span></span>
  }
  if (user.badges.identity || user.badges.license) {
    return <span className="chips"><span className="chip chip-teal"><Icon name="check" /> هویت تأییدشده</span></span>
  }
  return null
}

export function Person({ user }: { user: UserCard }) {
  const body = (
    <span className="person">
      <Avatar user={user} />
      <span className="meta">
        <b>{user.name}</b>
        <span className="muted">{user.specialty_title || user.role_label}</span>
      </span>
    </span>
  )
  if (!user.slug || user.anonymous) return body
  return <Link to={user.is_self ? '/profile' : `/doctors/${user.slug}`}>{body}</Link>
}

export function Top({ title, back = false, action, brand = false }: { title: string; back?: boolean; action?: ReactNode; brand?: boolean }) {
  return (
    <header className="topbar">
      {back ? <button className="icon-btn" type="button" onClick={() => history.back()} aria-label="بازگشت"><Icon name="back" /></button> : brand ? <Brand /> : <span />}
      {!brand && <h1 className="page-title">{title}</h1>}
      <div className="topbar-actions">{action}</div>
    </header>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={on ? 'toggle on' : 'toggle'}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  )
}

export function Empty({
  title,
  text,
  icon = 'sparkles',
  action,
}: {
  title: string
  text: string
  icon?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      className="empty-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
    >
      <span className="empty-icon"><Icon name={icon} /></span>
      <strong>{title}</strong>
      <span>{text}</span>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </motion.div>
  )
}

export function Skel() {
  return (
    <div className="stack" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="load-line" />
      {[0, 1].map((item) => (
        <article key={item} className="card post-card skel-card">
          <div className="post-head">
            <span className="skel skel-avatar" />
            <div className="meta">
              <span className="skel skel-line" style={{ width: '42%' }} />
              <span className="skel skel-line" style={{ width: '26%', marginTop: 6 }} />
            </div>
          </div>
          <div className="skel skel-photo" />
          <div className="skel skel-line" style={{ width: '70%', margin: '10px 12px 0' }} />
        </article>
      ))}
    </div>
  )
}

function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function PostCard({
  post,
  onChange,
  flush = false,
  variant = 'featured',
  impressionSource = 'feed',
  onComment,
  onRemove,
  detail = false,
}: {
  post: Post
  onChange: (post: Post) => void
  flush?: boolean
  variant?: 'featured' | 'following'
  impressionSource?: ImpressionSource
  onComment?: () => void
  onRemove?: () => void
  detail?: boolean
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [saved, setSaved] = useState(post.bookmarked)
  const [reposted, setReposted] = useState(false)
  const [burst, setBurst] = useState(false)
  const lastTap = useRef(0)
  const impressionRef = useImpression(post.id, impressionSource, !detail && !flush && !post.author.is_self)

  useEffect(() => { setSaved(post.bookmarked) }, [post.bookmarked, post.id])
  const hasMedia = post.media.length > 0 || postCover(post)

  const toggle = async () => {
    try {
      const next = await api<{ data: Post }>(`/posts/${post.id}/reactions`, { method: post.reacted ? 'DELETE' : 'POST' })
      onChange(next.data)
    } catch (reason) {
      toast.show(errText(reason), 'error')
    }
  }

  const onMediaClick = () => {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      lastTap.current = 0
      setBurst(true)
      window.setTimeout(() => setBurst(false), 750)
      if (!post.reacted) void toggle()
      return
    }
    lastTap.current = now
    if (!detail) {
      window.setTimeout(() => {
        if (lastTap.current === now) navigate(`/posts/${post.id}`)
      }, 280)
    }
  }

  const openDetail = () => {
    if (!detail) navigate(`/posts/${post.id}`)
  }

  const carousel = hasMedia ? <MediaCarousel post={post} className="post-photo" /> : null
  const media = carousel
    ? (
      <div
        role={detail ? undefined : 'button'}
        tabIndex={detail ? undefined : 0}
        className="post-media-hit"
        onClick={onMediaClick}
        onKeyDown={(event) => { if (!detail && (event.key === 'Enter' || event.key === ' ')) openDetail() }}
        aria-label={detail ? undefined : 'مشاهده پست'}
      >
        {carousel}
        <AnimatePresence>
          {burst && (
            <motion.span
              className="double-tap-heart"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: [0.4, 1.25, 1] }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.45 }}
            >
              <Icon name="heart" filled />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    )
    : null

  if (flush) {
    return (
      <article className="card post-card flush">
        {media}
        {post.body && <p className="post-caption">{post.body}</p>}
      </article>
    )
  }

  const cardClass = variant === 'following'
    ? 'card post-card post-card--following'
    : 'card post-card post-card--featured'
  const authorHref = !post.author.anonymous && post.author.slug
    ? (post.author.is_self ? '/profile' : `/doctors/${post.author.slug}`)
    : null
  const authorContent = (
    <>
      <Avatar user={post.author} />
      <div className="meta">
        <div className="name-row">
          <span className="name">{post.author.name}</span>
          <VerifiedSeal user={post.author} />
        </div>
        <div className="spec">
          {post.author.specialty_title || post.author.role_label}
          {post.created_at && <span className="when"> · {when(post.created_at)}</span>}
        </div>
      </div>
    </>
  )
  const repostCover = post.repost_of ? postCover(post.repost_of) : undefined

  return (
    <motion.article
      ref={impressionRef}
      className={cardClass}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="post-head">
        {authorHref
          ? <Link className="post-author-link" to={authorHref}>{authorContent}</Link>
          : <div className="post-author-link">{authorContent}</div>}
        <PostOwnerActions post={post} onChange={onChange} onRemove={onRemove} />
      </div>
      {media}
      {post.body && (
        detail
          ? <p className="post-caption"><MentionText text={post.body} /></p>
          : (
            <button type="button" className="post-caption-hit" onClick={openDetail}>
              <p className="post-caption"><MentionText text={post.body} /></p>
            </button>
          )
      )}
      {post.repost_of && (
        <Link className="repost-quote" to={`/posts/${post.repost_of.id}`}>
          <div className="repost-quote-head">
            <Avatar user={post.repost_of.author} small />
            <b>{post.repost_of.author.name}</b>
            <VerifiedSeal user={post.repost_of.author} />
            <span className="muted">{post.repost_of.author.specialty_title || post.repost_of.author.role_label}</span>
          </div>
          {post.repost_of.body && <p className="repost-quote-body">{post.repost_of.body}</p>}
          {repostCover && (
            <div className="repost-quote-media">
              <img src={repostCover} alt="" loading="lazy" />
            </div>
          )}
        </Link>
      )}
      {post.link_url && (
        <a className="post-link-card" href={post.link_url} target="_blank" rel="noreferrer">
          <span className="post-link-icon"><Icon name="external" /></span>
          <span className="post-link-body">
            <span className="post-link-title">{post.link_title || post.link_url}</span>
            <span className="post-link-host">{linkHost(post.link_url)}</span>
          </span>
        </a>
      )}
      <div className="actions">
        <motion.button
          whileTap={{ scale: 0.85 }}
          className={saved ? 'bookmark is-on' : 'bookmark'}
          type="button"
          aria-pressed={saved}
          aria-label="ذخیره"
          onClick={() => {
            const next = !saved
            setSaved(next)
            void api(`/posts/${post.id}/bookmark`, { method: saved ? 'DELETE' : 'POST' })
              .then(() => {
                onChange({ ...post, bookmarked: next })
                toast.show(next ? 'در ذخیره‌شده‌ها ثبت شد' : 'از ذخیره‌شده‌ها برداشته شد', 'info')
              })
              .catch((reason) => {
                setSaved(!next)
                toast.show(errText(reason), 'error')
              })
          }}
        >
          <Icon name="bookmark" filled={saved} />
        </motion.button>
        <div className="reactions">
          <motion.button
            whileTap={{ scale: 0.88 }}
            className={post.reacted ? 'react like is-on' : 'react like'}
            type="button"
            aria-pressed={post.reacted}
            onClick={() => void toggle()}
          >
            <motion.span
              style={{ display: 'inline-flex' }}
              animate={post.reacted ? { scale: [1, 1.32, 1] } : { scale: 1 }}
              transition={{ duration: 0.28 }}
            >
              <Icon name="heart" filled={post.reacted} />
            </motion.span>
            {fa.format(post.reactions_count)}
          </motion.button>
          {detail || onComment
            ? (
              <button className="react comment" type="button" onClick={onComment}>
                <Icon name="comment" filled={false} /> {fa.format(post.comments_count)}
              </button>
            )
            : (
              <Link className="react comment" to={`/posts/${post.id}#comments`}>
                <Icon name="comment" filled={false} /> {fa.format(post.comments_count)}
              </Link>
            )}
          <motion.button
            whileTap={{ scale: 0.88 }}
            className={reposted ? 'react share is-on' : 'react share'}
            type="button"
            onClick={() => void api(`/posts/${post.id}/repost`, { method: 'POST', body: JSON.stringify({}) })
              .then(() => {
                setReposted(true)
                onChange({ ...post, reposts_count: post.reposts_count + 1 })
                toast.show('بازنشر شد', 'success')
              })
              .catch((reason) => toast.show(errText(reason), 'error'))}
          >
            <Icon name="repost" /> {fa.format(post.reposts_count)}
          </motion.button>
        </div>
      </div>
      {!detail && post.comments_count > 0 && (
        onComment
          ? <button type="button" className="post-comments-hint" onClick={onComment}><span>مشاهده همه {fa.format(post.comments_count)} نظر</span></button>
          : <Link className="post-comments-hint" to={`/posts/${post.id}#comments`}><span>مشاهده همه {fa.format(post.comments_count)} نظر</span></Link>
      )}
    </motion.article>
  )
}

export function PostOwnerActions({
  post,
  onChange,
  onRemove,
}: {
  post: Post
  onChange: (post: Post) => void
  onRemove?: () => void
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [body, setBody] = useState(post.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!post.author.is_self) return null

  return (
    <>
      <button className="icon-btn post-more" type="button" aria-label="گزینه‌های پست" onClick={() => setOpen(true)}>
        <Icon name="more" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <Link className="sheet-item" to={`/insights/posts/${post.id}`} onClick={() => setOpen(false)}>
          <Icon name="insights" /> آمار پست
        </Link>
        <button className="sheet-item" type="button" onClick={() => { setOpen(false); setBody(post.body ?? ''); setEditing(true) }}>
          <Icon name="edit" /> ویرایش متن
        </button>
        <button className="sheet-item danger" type="button" onClick={() => { setOpen(false); setConfirmDelete(true) }}>
          <Icon name="trash" /> حذف پست
        </button>
      </Sheet>
      <ConfirmSheet
        open={confirmDelete}
        title="حذف پست"
        text="این پست به‌طور کامل از فید و پروفایل شما حذف خواهد شد."
        confirmLabel="بله، حذف شود"
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setBusy(true)
          void api(`/posts/${post.id}`, { method: 'DELETE' })
            .then(() => {
              setConfirmDelete(false)
              toast.show('پست حذف شد', 'info')
              onRemove?.()
            })
            .catch((reason) => toast.show(errText(reason), 'error'))
            .finally(() => setBusy(false))
        }}
      />
      <Sheet open={editing} onClose={() => setEditing(false)}>
        <form
          className="stack"
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            void api<{ data: Post }>(`/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ body }) })
              .then((payload) => {
                onChange(payload.data)
                setEditing(false)
                toast.show('تغییرات ذخیره شد', 'success')
              })
              .catch((reason) => setError(errText(reason)))
              .finally(() => setBusy(false))
          }}
        >
          <h2>ویرایش پست</h2>
          <MentionBox multiline className="textarea" value={body} onChange={setBody} placeholder="متن پست — برای منشن @ بنویسید" />
          {error && <div className="error">{error}</div>}
          <Button variant="primary" block loading={busy} type="submit">ذخیره تغییرات</Button>
        </form>
      </Sheet>
    </>
  )
}

export function errText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطا'
}
