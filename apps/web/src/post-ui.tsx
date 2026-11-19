import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, when } from './api'
import type { Comment, Post } from './types'
import { Avatar, MediaCarousel, MentionBox, MentionText, Person, PostOwnerActions, postCover, PostCard, errText } from './ui'
import { Icon } from './icons'

export function CommentSheet({
  postId,
  open,
  onClose,
  onChange,
}: {
  postId: number | null
  open: boolean
  onClose: () => void
  onChange?: (post: Post) => void
}) {
  const [post, setPost] = useState<Post | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!open || !postId) return
    void api<{ data: Post }>(`/posts/${postId}`).then((payload) => setPost(payload.data)).catch((reason) => setError(errText(reason)))
    requestAnimationFrame(() => setVisible(true))
    return () => setVisible(false)
  }, [open, postId])

  const reload = () => {
    if (!postId) return
    void api<{ data: Post }>(`/posts/${postId}`).then((payload) => {
      setPost(payload.data)
      onChange?.(payload.data)
    })
  }

  if (!open) return null

  return (
    <div className={`comment-sheet-overlay${visible ? ' is-open' : ''}`} onClick={onClose} role="presentation">
      <div className={`comment-sheet${visible ? ' is-open' : ''}`} onClick={(event) => event.stopPropagation()}>
        <span className="comment-sheet-handle" aria-hidden="true" />
        <header className="comment-sheet-head">
          <h2>نظرات</h2>
          <button className="icon-btn" type="button" aria-label="بستن" onClick={onClose}><Icon name="back" /></button>
        </header>
        <div className="comment-sheet-body">
          {error && <div className="error">{error}</div>}
          {post?.comments?.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
          {post && (post.comments?.length ?? 0) === 0 && <p className="muted center">اولین نظر را بنویسید.</p>}
        </div>
        <form
          className="comment-sheet-compose"
          onSubmit={(event) => {
            event.preventDefault()
            if (!postId || !text.trim()) return
            void api(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body: text }) })
              .then(() => { setText(''); reload() })
              .catch((reason) => setError(errText(reason)))
          }}
        >
          <input className="input" value={text} onChange={(event) => setText(event.target.value)} placeholder="نظر..." aria-label="متن نظر" />
          <button className="btn btn-primary" type="submit">ارسال</button>
        </form>
      </div>
    </div>
  )
}

export function CommentRow({ comment }: { comment: Comment }) {
  return (
    <div className="comment-row">
      <Person user={comment.author} />
      <p>{comment.body}</p>
      {comment.replies?.map((reply) => (
        <div key={reply.id} className="comment-reply">
          <b>{reply.author.name}</b>
          <p>{reply.body}</p>
        </div>
      ))}
    </div>
  )
}

const faCount = new Intl.NumberFormat('fa-IR')

type ReplyTarget = { id: number; name: string }

function IgCommentBlock({
  comment,
  onReplyToThread,
}: {
  comment: Comment
  onReplyToThread: (target: ReplyTarget) => void
}) {
  const thread = { id: comment.id, name: comment.author.name }
  return (
    <article className="ig-comment">
      <Avatar user={comment.author} small />
      <div className="ig-comment-body">
        <p className="ig-comment-text">
          <b>{comment.author.name}</b>
          <span><MentionText text={comment.body} /></span>
        </p>
        <div className="ig-comment-meta">
          {comment.created_at && <time>{when(comment.created_at)}</time>}
          <button type="button" className="ig-reply-btn" onClick={() => onReplyToThread(thread)}>پاسخ</button>
        </div>
        {comment.replies?.map((reply) => (
          <article key={reply.id} className="ig-comment ig-comment--nested">
            <Avatar user={reply.author} small />
            <div className="ig-comment-body">
              <p className="ig-comment-text">
                <b>{reply.author.name}</b>
                <span><MentionText text={reply.body} /></span>
              </p>
              <div className="ig-comment-meta">
                {reply.created_at && <time>{when(reply.created_at)}</time>}
                <button type="button" className="ig-reply-btn" onClick={() => onReplyToThread(thread)}>پاسخ</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </article>
  )
}

function IgPostToolbar({
  post,
  saved,
  setSaved,
  onLike,
}: {
  post: Post
  saved: boolean
  setSaved: (next: boolean) => void
  onLike: () => void
}) {
  return (
    <section className="ig-post-toolbar">
      <div className="ig-post-actions">
        <button className={post.reacted ? 'ig-act like is-on' : 'ig-act like'} type="button" onClick={onLike} aria-pressed={post.reacted}>
          <Icon name="heart" />
        </button>
        <button className="ig-act" type="button" onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })} aria-label="نظرات">
          <Icon name="comment" />
        </button>
        <button
          className="ig-act"
          type="button"
          aria-label="ذخیره"
          aria-pressed={saved}
          onClick={() => {
            setSaved(!saved)
            void api(`/posts/${post.id}/bookmark`, { method: saved ? 'DELETE' : 'POST' })
          }}
        >
          <Icon name="bookmark" />
        </button>
      </div>
      {post.reactions_count > 0 && <p className="ig-post-likes">{faCount.format(post.reactions_count)} پسند</p>}
      {post.body && (
        <p className="ig-post-caption">
          <b>{post.author.name}</b> <MentionText text={post.body} />
        </p>
      )}
      {post.created_at && <time className="ig-post-time">{when(post.created_at)}</time>}
    </section>
  )
}

/** صفحهٔ پست — چیدمان شبیه اینستاگرام */
export function InstagramPostDetail({
  post,
  onChange,
  onRemove,
}: {
  post: Post
  onChange: (post: Post) => void
  onRemove?: () => void
}) {
  const [saved, setSaved] = useState(post.bookmarked)
  useEffect(() => { setSaved(post.bookmarked) }, [post.bookmarked, post.id])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasMedia = post.media.length > 0 || !!postCover(post)

  const reload = () => {
    void api<{ data: Post }>(`/posts/${post.id}`).then((payload) => onChange(payload.data)).catch((reason) => setError(errText(reason)))
  }

  const toggleLike = () => {
    void api<{ data: Post }>(`/posts/${post.id}/reactions`, { method: post.reacted ? 'DELETE' : 'POST' }).then((payload) => onChange(payload.data))
  }

  const pickReply = (target: ReplyTarget) => {
    setReplyTo(target)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <article className="ig-post" aria-label="جزئیات پست">
      {hasMedia && <MediaCarousel post={post} className="ig-post-media" />}
      <div className="ig-owner-row">
        <PostOwnerActions post={post} onChange={onChange} onRemove={onRemove} />
      </div>
      <IgPostToolbar post={post} saved={saved} setSaved={setSaved} onLike={toggleLike} />
      <div className="ig-post-feed" id="comments">
        {post.comments_count > 0 && (
          <p className="ig-post-count">{faCount.format(post.comments_count)} نظر</p>
        )}
        {post.comments?.map((comment) => (
          <IgCommentBlock key={comment.id} comment={comment} onReplyToThread={pickReply} />
        ))}
        {(post.comments?.length ?? 0) === 0 && (
          <p className="muted ig-post-empty">هنوز نظری نیست — اولین نفر باشید.</p>
        )}
      </div>
      {replyTo && (
        <div className="ig-reply-strip">
          <span>پاسخ به <b>{replyTo.name}</b></span>
          <button type="button" className="text-btn" onClick={() => setReplyTo(null)} aria-label="لغو پاسخ">انصراف</button>
        </div>
      )}
      <form
        className="ig-compose"
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim() || busy) return
          setBusy(true)
          setError('')
          void api(`/posts/${post.id}/comments`, {
            method: 'POST',
            body: JSON.stringify(replyTo ? { body: text.trim(), parent_id: replyTo.id } : { body: text.trim() }),
          })
            .then(() => {
              setText('')
              setReplyTo(null)
              reload()
            })
            .catch((reason) => setError(errText(reason)))
            .finally(() => setBusy(false))
        }}
      >
        {error && <div className="error ig-compose-error">{error}</div>}
        <div className="ig-compose-row">
          <MentionBox
            inputRef={inputRef}
            className="ig-compose-input"
            value={text}
            onChange={setText}
            placeholder={replyTo ? `پاسخ به ${replyTo.name}...` : 'افزودن نظر... برای منشن @ بنویسید'}
          />
          <button className="ig-compose-send" type="submit" disabled={busy || !text.trim()}>ارسال</button>
        </div>
      </form>
    </article>
  )
}

export function PostGrid({
  posts,
  aspect = 'portrait',
  onOpen,
}: {
  posts: Post[]
  aspect?: 'square' | 'portrait'
  onOpen?: (post: Post, index: number) => void
}) {
  if (posts.length === 0) return null
  return (
    <div className={`post-grid post-grid--${aspect}`} role="list">
      {posts.map((post, index) => {
        const cover = postCover(post)
        const label = post.body?.slice(0, 48) || post.link_title || 'پست'
        const inner = (
          <>
            {cover
              ? <img src={cover} alt="" loading="lazy" decoding="async" />
              : <span className="post-grid-text">{label}</span>}
            {post.media.length > 1 && <span className="post-grid-stack" aria-hidden="true">❐</span>}
            {post.type === 'repost' && <span className="post-grid-badge" aria-hidden="true"><Icon name="repost" /></span>}
            {post.media[0]?.kind === 'video' && <span className="post-grid-badge video" aria-hidden="true">▶</span>}
          </>
        )
        return onOpen
          ? (
            <button key={post.id} className="post-grid-cell" type="button" onClick={() => onOpen(post, index)} role="listitem">
              {inner}
            </button>
          )
          : (
            <Link key={post.id} className="post-grid-cell" to={`/posts/${post.id}`} role="listitem">
              {inner}
            </Link>
          )
      })}
    </div>
  )
}

export function PostViewer({
  posts,
  startIndex,
  onClose,
}: {
  posts: Post[]
  startIndex: number
  onClose: () => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [commentId, setCommentId] = useState<number | null>(null)
  const [items, setItems] = useState(posts)

  useEffect(() => {
    const node = trackRef.current
    if (!node) return
    const slide = node.children[startIndex] as HTMLElement | undefined
    slide?.scrollIntoView({ block: 'start' })
  }, [startIndex])

  return (
    <div className="post-viewer">
      <header className="post-viewer-head">
        <button className="icon-btn" type="button" aria-label="بستن" onClick={onClose}><Icon name="back" /></button>
        <span>اکسپلور</span>
      </header>
      <div ref={trackRef} className="post-viewer-scroll">
        {items.map((post) => (
          <section key={post.id} className="post-viewer-slide">
            <PostCard
              post={post}
              variant="featured"
              onComment={() => setCommentId(post.id)}
              onChange={(next) => setItems((rows) => rows.map((row) => (row.id === next.id ? next : row)))}
            />
          </section>
        ))}
      </div>
      <CommentSheet
        postId={commentId}
        open={commentId != null}
        onClose={() => setCommentId(null)}
        onChange={(next) => setItems((rows) => rows.map((row) => (row.id === next.id ? next : row)))}
      />
    </div>
  )
}

export type ComposeSlide = { id: string; file: File; preview: string }

export function ComposeMediaField({
  slides,
  coverIndex,
  onSlides,
  onCover,
}: {
  slides: ComposeSlide[]
  coverIndex: number
  onSlides: (rows: ComposeSlide[]) => void
  onCover: (index: number) => void
}) {
  const addFiles = (list: FileList | null) => {
    if (!list) return
    const next = [...slides]
    for (const file of Array.from(list)) {
      next.push({ id: `${Date.now()}-${file.name}`, file, preview: URL.createObjectURL(file) })
    }
    onSlides(next.slice(0, 6))
  }

  const remove = (id: string) => {
    const row = slides.find((item) => item.id === id)
    if (row) URL.revokeObjectURL(row.preview)
    onSlides(slides.filter((item) => item.id !== id))
  }

  return (
    <div className="compose-media">
      <label className="compose-media-add">
        <span>افزودن اسلاید (حداکثر ۶)</span>
        <input hidden type="file" accept="image/*,video/mp4,video/webm" multiple onChange={(e) => addFiles(e.target.files)} />
      </label>
      {slides.length > 0 && (
        <div className="compose-media-strip">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === coverIndex ? 'compose-thumb is-cover' : 'compose-thumb'}
              onClick={() => onCover(index)}
            >
              <img src={slide.preview} alt="" />
              {index === coverIndex && <span className="cover-tag">کاور</span>}
              <span
                className="remove"
                role="button"
                tabIndex={-1}
                onClick={(event) => { event.stopPropagation(); remove(slide.id) }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      {slides.length > 1 && <p className="muted compose-hint">برای انتخاب کاور روی تصویر بزنید. در فید همان تصویر نمایش داده می‌شود.</p>}
    </div>
  )
}