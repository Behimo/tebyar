import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, when } from './api'
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

export function Avatar({ user, large = false }: { user: Pick<UserCard, 'name' | 'avatar_url' | 'slug'>; large?: boolean }) {
  const src = user.avatar_url || (user.slug ? portraits[user.slug] : undefined)
  if (src) return <img className={large ? 'avatar lg' : 'avatar'} src={src} alt="" />
  return <span className={large ? 'avatar lg' : 'avatar'} style={{ display: 'grid', placeItems: 'center', fontWeight: 700 }}>{user.name.trim().charAt(0)}</span>
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

export function PostCard({ post, onChange, flush = false }: { post: Post; onChange: (post: Post) => void; flush?: boolean }) {
  const [saved, setSaved] = useState(post.bookmarked)
  const photo = post.media[0]?.url || (post.is_demo ? covers[post.author.slug || ''] : undefined)
  const toggle = async () => {
    const next = await api<{ data: Post }>(`/posts/${post.id}/reactions`, { method: post.reacted ? 'DELETE' : 'POST' })
    onChange(next.data)
  }

  const media = photo ? (
    <Link className="post-photo" to={`/posts/${post.id}`}>
      {post.media[0]?.kind === 'video' ? <video src={photo} /> : <img src={photo} alt="" />}
    </Link>
  ) : null

  if (flush) {
    return (
      <article className="card post-card flush">
        {media}
        {post.body && <p className="post-caption">{post.body}</p>}
      </article>
    )
  }

  return (
    <article className="card post-card">
      <div className="post-head">
        <Avatar user={post.author} />
        <div className="meta">
          <div className="name">{post.author.name}</div>
          <div className="spec">
            {post.author.specialty_title || post.author.role_label}
            {post.created_at && <span className="when"> · {when(post.created_at)}</span>}
          </div>
          <Badges user={post.author} />
        </div>
      </div>
      {post.body && <p className="post-caption">{post.body}</p>}
      {media}
      {post.repost_of && <p className="post-caption muted">بازنشر از {post.repost_of.author.name}: {post.repost_of.body}</p>}
      {post.link_url && <a className="post-link" href={post.link_url}>{post.link_title || post.link_url}</a>}
      <div className="actions">
        <button className="bookmark" type="button" aria-pressed={saved} aria-label="ذخیره" onClick={() => {
          setSaved(!saved)
          void api(`/posts/${post.id}/bookmark`, { method: saved ? 'DELETE' : 'POST' })
        }}><Icon name="bookmark" /></button>
        <div className="reactions">
          <button className={post.reacted ? 'react like is-on' : 'react like'} type="button" onClick={() => void toggle()}><Icon name="heart" /> {fa.format(post.reactions_count)}</button>
          <Link className="react comment" to={`/posts/${post.id}`}><Icon name="comment" /> {fa.format(post.comments_count)}</Link>
          <button className="react share" type="button" onClick={() => void api(`/posts/${post.id}/repost`, { method: 'POST', body: JSON.stringify({}) }).then(() => onChange({ ...post, reposts_count: post.reposts_count + 1 }))}><Icon name="share" /> {fa.format(post.reposts_count)}</button>
        </div>
      </div>
    </article>
  )
}

export function errText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطا'
}
