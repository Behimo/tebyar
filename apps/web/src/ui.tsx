import { useEffect, useRef, useState, type ReactNode, type RefObject, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { api, assetUrl, when } from './api'
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
          <div className="media-dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={i === index ? 'dot is-on' : 'dot'} aria-label={`اسلاید ${i + 1}`} onClick={(event) => { event.stopPropagation(); setIndex(i) }} />
            ))}
          </div>
          <span className="media-count">{index + 1}/{slides.length}</span>
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
  return <span className="verify-label">احراز هویت شده</span>
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="overlay is-open" onClick={onClose}>
      <div className="sheet sheet-up" onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  )
}

export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[a-z0-9][a-z0-9_-]*)/gi)
  return (
    <>
      {parts.map((part, index) => (
        part.startsWith('@')
          ? <Link key={index} className="mention" to={`/doctors/${part.slice(1)}`}>{part}</Link>
          : <span key={index}>{part}</span>
      ))}
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

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
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

export function PostCard({
  post,
  onChange,
  flush = false,
  variant = 'featured',
  onComment,
  onRemove,
  detail = false,
}: {
  post: Post
  onChange: (post: Post) => void
  flush?: boolean
  variant?: 'featured' | 'following'
  onComment?: () => void
  onRemove?: () => void
  detail?: boolean
}) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(post.bookmarked)
  const hasMedia = post.media.length > 0 || postCover(post)
  const toggle = async () => {
    const next = await api<{ data: Post }>(`/posts/${post.id}/reactions`, { method: post.reacted ? 'DELETE' : 'POST' })
    onChange(next.data)
  }

  const openDetail = () => {
    if (!detail) navigate(`/posts/${post.id}`)
  }
  const carousel = hasMedia ? <MediaCarousel post={post} className="post-photo" /> : null
  const media = carousel && !detail
    ? (
      <div role="button" tabIndex={0} className="post-media-hit" onClick={openDetail} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openDetail() }} aria-label="مشاهده پست">
        {carousel}
      </div>
    )
    : carousel

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

  return (
    <article className={cardClass}>
      <div className="post-head">
        <Avatar user={post.author} />
        <div className="meta">
          <div className="name">{post.author.name}</div>
          <div className="spec">
            {post.author.specialty_title || post.author.role_label}
            {post.created_at && <span className="when"> · {when(post.created_at)}</span>}
          </div>
        </div>
        <VerifiedSeal user={post.author} />
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
      {post.repost_of && <p className="post-caption muted">بازنشر از {post.repost_of.author.name}</p>}
      {post.link_url && <a className="post-link" href={post.link_url} rel="noreferrer">{post.link_title || post.link_url}</a>}
      <div className="actions">
        <button className="bookmark" type="button" aria-pressed={saved} aria-label="ذخیره" onClick={() => {
          setSaved(!saved)
          void api(`/posts/${post.id}/bookmark`, { method: saved ? 'DELETE' : 'POST' })
        }}><Icon name="bookmark" /></button>
        <div className="reactions">
          <button className={post.reacted ? 'react like is-on' : 'react like'} type="button" onClick={() => void toggle()}><Icon name="heart" /> {fa.format(post.reactions_count)}</button>
          {detail
            ? <button className="react comment" type="button" onClick={onComment}><Icon name="comment" /> {fa.format(post.comments_count)}</button>
            : onComment
              ? <button className="react comment" type="button" onClick={onComment}><Icon name="comment" /> {fa.format(post.comments_count)}</button>
              : <Link className="react comment" to={`/posts/${post.id}#comments`}><Icon name="comment" /> {fa.format(post.comments_count)}</Link>}
          <button className="react share" type="button" onClick={() => void api(`/posts/${post.id}/repost`, { method: 'POST', body: JSON.stringify({}) }).then(() => onChange({ ...post, reposts_count: post.reposts_count + 1 }))}><Icon name="repost" /> {fa.format(post.reposts_count)}</button>
        </div>
      </div>
    </article>
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
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(post.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!post.author.is_self) return null

  return (
    <>
      <button className="icon-btn post-more" type="button" aria-label="گزینه‌های پست" onClick={() => setOpen(true)}>
        <Icon name="more" />
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
            <button className="sheet-item" type="button" onClick={() => { setOpen(false); setBody(post.body ?? ''); setEditing(true) }}>ویرایش متن</button>
            <button
              className="sheet-item danger"
              type="button"
              onClick={() => {
                if (!window.confirm('این پست حذف شود؟')) return
                void api(`/posts/${post.id}`, { method: 'DELETE' })
                  .then(() => { setOpen(false); onRemove?.() })
                  .catch((reason) => setError(errText(reason)))
              }}
            >
              حذف پست
            </button>
            {error && <div className="error">{error}</div>}
        </Sheet>
      )}
      {editing && (
        <Sheet onClose={() => setEditing(false)}>
          <form
            className="stack"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              setBusy(true)
              void api<{ data: Post }>(`/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ body }) })
                .then((payload) => { onChange(payload.data); setEditing(false) })
                .catch((reason) => setError(errText(reason)))
                .finally(() => setBusy(false))
            }}
          >
            <h2>ویرایش پست</h2>
            <MentionBox multiline className="area" value={body} onChange={setBody} placeholder="متن پست — برای منشن @ بنویسید" />
            {error && <div className="error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? '...' : 'ذخیره'}</button>
          </form>
        </Sheet>
      )}
    </>
  )
}

export function errText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطا'
}
