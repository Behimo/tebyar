import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { api, when } from './api'
import type { Post, UserCard } from './types'

export function Avatar({ user, large = false }: { user: Pick<UserCard, 'name' | 'avatar_url'>; large?: boolean }) {
  const letter = user.name.trim().charAt(0) || 'ط'
  return (
    <span className={large ? 'avatar lg' : 'avatar'}>
      {user.avatar_url ? <img src={user.avatar_url} alt="" /> : letter}
    </span>
  )
}

export function Badges({ user }: { user: UserCard }) {
  return (
    <span className="chips">
      {user.badges.education && <span className="chip">هویت تحصیلی</span>}
      {user.badges.identity && <span className="chip blue">هویت</span>}
      {user.badges.license && <span className="chip">پروانه</span>}
      {user.badges.specialty && <span className="chip coral">تخصص</span>}
    </span>
  )
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

export function Top({ title, back = false, action }: { title: string; back?: boolean; action?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? <button className="icon-btn" type="button" onClick={() => history.back()} aria-label="بازگشت">‹</button> : <span className="icon-btn" />}
      <h1 className="page-title">{title}</h1>
      {action ?? <span className="icon-btn" />}
    </header>
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
    <div className="pad stack">
      <div className="skel" style={{ height: 88 }} />
      <div className="skel" style={{ height: 160 }} />
      <div className="skel" style={{ height: 160 }} />
    </div>
  )
}

export function PostCard({ post, onChange }: { post: Post; onChange: (post: Post) => void }) {
  const [pop, setPop] = useState(false)
  const toggle = async () => {
    const path = `/posts/${post.id}/reactions`
    const next = await api<{ data: Post }>(path, { method: post.reacted ? 'DELETE' : 'POST' })
    if (!post.reacted) {
      setPop(true)
      window.setTimeout(() => setPop(false), 350)
    }
    onChange(next.data)
  }

  return (
    <article className="card stack rise">
      <Person user={post.author} />
      {post.body && <p style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.body}</p>}
      {post.repost_of && (
        <Link to={`/posts/${post.repost_of.id}`} className="link-card">
          <b>{post.repost_of.author.name}</b>
          <p className="muted">{post.repost_of.body}</p>
        </Link>
      )}
      {post.media.map((media) => (
        <div className="media" key={media.url}>
          {media.kind === 'video' ? <video src={media.url} controls /> : <img src={media.url} alt="" />}
        </div>
      ))}
      {post.link_url && (
        <a className="link-card" href={post.link_url} target="_blank" rel="noreferrer">
          <b>{post.link_title || post.link_url}</b>
        </a>
      )}
      {post.hashtags.length > 0 && (
        <div className="chips">{post.hashtags.map((tag) => <span className="chip plain" key={tag}>#{tag}</span>)}</div>
      )}
      <div className="row between">
        <div className="actions">
          <motion.button type="button" className={post.reacted ? `on ${pop ? 'pop' : ''}` : ''} onClick={() => void toggle()} whileTap={{ scale: 0.9 }}>
            ❤ {post.reactions_count}
          </motion.button>
          <Link to={`/posts/${post.id}`}>💬 {post.comments_count}</Link>
          <button type="button" onClick={() => void api(`/posts/${post.id}/repost`, { method: 'POST', body: JSON.stringify({}) }).then(() => onChange({ ...post, reposts_count: post.reposts_count + 1 }))}>
            ↻ {post.reposts_count}
          </button>
          <button type="button" onClick={() => void api(`/posts/${post.id}/bookmark`, { method: post.bookmarked ? 'DELETE' : 'POST' })}>
            {post.bookmarked ? '✓' : '☆'}
          </button>
        </div>
        <span className="faint">{when(post.created_at)}</span>
      </div>
    </article>
  )
}

export function errText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطا'
}
