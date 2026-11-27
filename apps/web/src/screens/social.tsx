import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api, assetUrl } from '../api'
import { useAuth } from '../auth'
import { recordDetailView } from '../impressions'
import { QuotaHint } from '../pro'
import type { Conversation, Notice, Post, Story, Topic, Reply, CommunityCard } from '../types'
import {
  Avatar,
  Badges,
  Button,
  Empty,
  Field,
  ListSkel,
  MentionBox,
  Person,
  PostCard,
  Segmented,
  Sheet,
  Skel,
  Top,
  VerifiedSeal,
  errText,
  useToast,
} from '../ui'
import { ComposeMediaField as ComposeMediaPicker, CommentSheet, InstagramPostDetail } from '../post-ui'
import { Brand, Icon } from '../icons'
import { readCache, writeCache } from '../cache'
import { buildStoryTiles, mergeStoryLists, myStories } from '../stories'
import { StoryStudio } from '../story-studio'

const communitiesKey = 'tebyar-communities'
const feedMemory: { suggested?: Post[]; following?: Post[]; stories?: Story[] } = {}
const storiesKey = 'tebyar-stories'

function activeStories(rows: Story[]): Story[] {
  const now = Date.now()
  return rows.filter((row) => {
    if (!row.expires_at) return true
    const expires = Date.parse(row.expires_at)
    return Number.isNaN(expires) || expires > now
  })
}

function readStories(): Story[] {
  if (feedMemory.stories) return activeStories(feedMemory.stories)
  try {
    const raw = sessionStorage.getItem(storiesKey)
    if (!raw) return []
    const rows = activeStories(JSON.parse(raw) as Story[])
    feedMemory.stories = rows
    return rows
  } catch {
    return []
  }
}

function writeStories(rows: Story[]) {
  const active = activeStories(rows)
  feedMemory.stories = active
  sessionStorage.setItem(storiesKey, JSON.stringify(active))
}

function readPosts(tab: 'suggested' | 'following'): Post[] | null {
  if (feedMemory[tab]) return feedMemory[tab]
  try {
    const raw = sessionStorage.getItem(`tebyar-feed-${tab}`)
    if (!raw) return null
    const posts = JSON.parse(raw) as Post[]
    feedMemory[tab] = posts
    return posts
  } catch {
    return null
  }
}

function writePosts(tab: 'suggested' | 'following', posts: Post[]) {
  feedMemory[tab] = posts
  sessionStorage.setItem(`tebyar-feed-${tab}`, JSON.stringify(posts))
}

function useInboxBadges() {
  const [messages, setMessages] = useState(0)
  const [notices, setNotices] = useState(0)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cachedConvs = readCache<Conversation[]>('tebyar-conversations')
      if (cachedConvs) {
        setMessages(cachedConvs.filter((item) => item.unread).length)
      } else {
        void api<{ data: Conversation[] }>('/conversations')
          .then((payload) => {
            writeCache('tebyar-conversations', payload.data)
            setMessages(payload.data.filter((item) => item.unread).length)
          })
          .catch(() => undefined)
      }
      void api<{ data: Notice[] }>('/notifications')
        .then((payload) => setNotices(payload.data.filter((item) => !item.read_at).length))
        .catch(() => undefined)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [])
  return { messages, notices }
}

function StoryReel({
  groups,
  startGroup,
  start,
  onClose,
  onSeen,
  onDelete,
}: {
  groups: Story[][]
  startGroup: number
  start: number
  onClose: () => void
  onSeen: (id: number) => void
  onDelete: (id: number) => void
}) {
  const [group, setGroup] = useState(startGroup)
  const [index, setIndex] = useState(start)
  useEffect(() => {
    setGroup(startGroup)
    setIndex(start)
  }, [startGroup, start, groups])
  const [note, setNote] = useState('')
  const [menu, setMenu] = useState(false)
  const [paused, setPaused] = useState(false)
  const [mediaState, setMediaState] = useState<{ id: number; loading: boolean }>({ id: 0, loading: true })
  const items = groups[group] ?? []
  const story = items[index]
  const mediaLoading = mediaState.id !== story?.id || mediaState.loading

  const go = (dir: 1 | -1) => {
    setNote('')
    setMenu(false)
    const next = index + dir
    if (next >= 0 && next < items.length) {
      setIndex(next)
      return
    }
    const nextGroup = group + dir
    if (nextGroup < 0 || nextGroup >= groups.length || (groups[nextGroup]?.length ?? 0) === 0) {
      onClose()
      return
    }
    setGroup(nextGroup)
    setIndex(dir > 0 ? 0 : groups[nextGroup].length - 1)
  }

  useEffect(() => {
    if (!story?.id) return
    onSeen(story.id)
    void api(`/stories/${story.id}/view`, { method: 'POST' }).catch(() => undefined)
  }, [story?.id])

  useEffect(() => {
    setNote('')
  }, [story?.id])

  useEffect(() => {
    const preload = [items[index + 1], items[index - 1], groups[group + 1]?.[0], groups[group - 1]?.[0]]
    for (const item of preload) {
      if (!item?.media_url) continue
      const image = new Image()
      image.src = assetUrl(item.media_url, 1080) ?? item.media_url
    }
  }, [group, groups, index, items])

  useEffect(() => {
    if (menu || paused || mediaLoading) return
    const timer = window.setTimeout(() => go(1), 5000)
    return () => window.clearTimeout(timer)
  }, [index, group, menu, paused, mediaLoading])

  useEffect(() => {
    document.body.dataset.cover = 'story'
    return () => { delete document.body.dataset.cover }
  }, [])

  if (!story) return null
  const authorHref = !story.author.anonymous && story.author.slug
    ? (story.author.is_self ? '/profile' : `/doctors/${story.author.slug}`)
    : null
  return createPortal(
    <div
      className={`story-viewer is-open${paused ? ' is-paused' : ''}${mediaLoading ? ' is-loading' : ''}`}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="progress">
        {items.map((item, i) => (
          <span key={item.id || i} className={i === index ? 'active' : i < index ? 'done' : ''}>
            <i />
          </span>
        ))}
      </div>
      <div className="who" onPointerDown={(e) => e.stopPropagation()}>
        {authorHref ? (
          <Link className="story-who-user" to={authorHref} onClick={onClose}>
            <Avatar user={story.author} small />
            <span>{story.author.name}</span>
            <VerifiedSeal user={story.author} />
          </Link>
        ) : (
          <div className="story-who-user">
            <Avatar user={story.author} small />
            <span>{story.author.name}</span>
          </div>
        )}
        <span className="story-who-actions">
          {story.mine && story.id > 0 && (
            <button className="icon-btn" type="button" aria-label="گزینه‌های استوری" onClick={(event) => { event.stopPropagation(); setMenu(true) }}>
              <Icon name="more" />
            </button>
          )}
          <button className="icon-btn" type="button" onClick={onClose} aria-label="بستن"><Icon name="close" /></button>
        </span>
      </div>
      {note && <p className="story-note">{note}</p>}
      <div className="media">
        <img
          key={story.id}
          src={assetUrl(story.media_url, 1080) || story.media_url}
          alt=""
          onLoad={() => setMediaState({ id: story.id, loading: false })}
          onError={() => {
            setMediaState({ id: story.id, loading: false })
            setNote('این تصویر روی گوشی باز نشد.')
          }}
        />
        {mediaLoading && <div className="story-media-loading" aria-hidden="true"><span className="btn-spinner" /></div>}
      </div>
      <button className="story-hit story-hit-next" type="button" aria-label="بعدی" onClick={() => go(1)} />
      <button className="story-hit story-hit-prev" type="button" aria-label="قبلی" onClick={() => go(-1)} />
      <Sheet front open={menu} onClose={() => setMenu(false)}>
        <button
          className="sheet-item danger"
          type="button"
          onClick={() => {
            const id = story.id
            setMenu(false)
            onDelete(id)
          }}
        >
          <Icon name="trash" /> حذف استوری
        </button>
      </Sheet>
    </div>,
    document.body,
  )
}

export function Home() {
  const [tab, setTab] = useState<'suggested' | 'following'>('suggested')
  const [posts, setPosts] = useState<Post[]>(() => readPosts('suggested') ?? [])
  const [stories, setStories] = useState<Story[]>(readStories)
  const [storiesLoaded, setStoriesLoaded] = useState(() => readStories().length > 0)
  const [loading, setLoading] = useState(() => readPosts('suggested') == null)
  const [error, setError] = useState('')
  const [reel, setReel] = useState<{ groups: Story[][]; group: number; index: number } | null>(null)
  const [storyUploading, setStoryUploading] = useState(false)
  const [storyPreview, setStoryPreview] = useState<string | null>(null)
  const [storyDraft, setStoryDraft] = useState<File | null>(null)
  const [commentId, setCommentId] = useState<number | null>(null)
  const { user, refresh } = useAuth()
  const toast = useToast()
  const badges = useInboxBadges()
  const mine = myStories(stories, user)
  const feedGen = useRef(0)

  useEffect(() => {
    let gone = false
    const gen = ++feedGen.current
    const cached = readPosts(tab)
    if (cached) {
      setPosts(cached)
      setLoading(false)
    } else {
      setPosts([])
      setLoading(true)
    }
    api<{ data: Post[] }>(`/feed?tab=${tab}`).then((feed) => {
      if (gone || gen !== feedGen.current) return
      setPosts(feed.data)
      writePosts(tab, feed.data)
      setError('')
    }).catch((reason) => {
      if (!gone && !cached) setError(errText(reason))
    }).finally(() => {
      if (!gone) setLoading(false)
    })
    return () => { gone = true }
  }, [tab])

  useEffect(() => {
    let gone = false
    api<{ data: Story[] }>('/stories').then((storyList) => {
      if (gone) return
      writeStories(storyList.data)
      setStories(storyList.data)
    }).catch(() => undefined).finally(() => {
      if (!gone) setStoriesLoaded(true)
    })
    const expiryTimer = window.setInterval(() => {
      setStories((current) => {
        const active = activeStories(current)
        if (active.length === current.length) return current
        writeStories(active)
        return active
      })
    }, 30000)
    return () => {
      gone = true
      window.clearInterval(expiryTimer)
    }
  }, [])

  const publishStory = async (file: File) => {
    const preview = URL.createObjectURL(file)
    setStoryPreview(preview)
    setStoryUploading(true)
    const body = new FormData()
    body.append('media', file)
    try {
      const created = await api<{ data: Story }>('/stories', { method: 'POST', body })
      setStories((current) => {
        const next = mergeStoryLists(current, [created.data])
        writeStories(next)
        return next
      })
      const storyList = await api<{ data: Story[] }>('/stories')
      writeStories(storyList.data)
      setStories(storyList.data)
      URL.revokeObjectURL(preview)
      setStoryPreview(null)
      void refresh()
      toast.show('استوری منتشر شد', 'success')
    } catch (reason) {
      URL.revokeObjectURL(preview)
      setStoryPreview(null)
      toast.show(errText(reason), 'error')
    } finally {
      setStoryUploading(false)
    }
  }

  const tiles = buildStoryTiles(stories, user, storiesLoaded)
  const ownCover = storyPreview || assetUrl(mine[mine.length - 1]?.media_url, 240)
  const mineUnseen = mine.some((row) => !row.seen)

  const storyGroups = () => {
    const rows: Story[][] = []
    if (mine.length) rows.push(mine)
    for (const tile of tiles) {
      if (tile.items.length) rows.push(tile.items)
    }
    return rows
  }

  const openReel = (authorId: number | null, at = 0) => {
    const groups = storyGroups()
    const group = Math.max(0, groups.findIndex((rows) => rows[0]?.author.id === authorId || (authorId == null && rows[0]?.id === 0)))
    if (!groups[group]?.length && groups.length === 0) return
    setReel({ groups, group: groups[group] ? group : 0, index: at })
  }

  return (
    <>
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <Link className="icon-btn" to="/explore" aria-label="اکسپلور"><Icon name="explore" /></Link>
          <Link className="icon-btn" to="/messages" aria-label="پیام‌ها">
            <Icon name="direct" />
            {badges.messages > 0 && <span className="badge">{badges.messages > 9 ? '۹+' : String(badges.messages)}</span>}
          </Link>
          <Link className="icon-btn" to="/notifications" aria-label="اعلان‌ها">
            <Icon name="bell" />
            {badges.notices > 0 && <span className="badge">{badges.notices > 9 ? '۹+' : String(badges.notices)}</span>}
          </Link>
        </div>
      </header>
      <div className="screen-body">
        <div className="stories" dir="rtl" aria-label="استوری‌ها">
          <div className={`story story-own${ownCover ? ' has-story' : ''}${mineUnseen ? ' is-unseen' : ownCover ? ' is-seen' : ''}${storyUploading ? ' is-uploading' : ''}`}>
            {ownCover ? (
              <button className="story-tile" type="button" onClick={() => openReel(user?.id ?? null, 0)}>
                <img src={ownCover} alt="" decoding="async" /><span className="caption">شما</span>
              </button>
            ) : (
              <label className="story-tile">
                <span className="plus">+</span>
                <span className="own-label">استوری شما</span>
                <input hidden type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) setStoryDraft(file)
                  event.currentTarget.value = ''
                }} />
              </label>
            )}
            {ownCover && (
              <label className="story-add" aria-label="استوری جدید">
                +
                <input hidden type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) setStoryDraft(file)
                  event.currentTarget.value = ''
                }} />
              </label>
            )}
          </div>
          {tiles.map((story) => (
            <button
              key={story.id}
              className={`story${story.unseen ? ' is-unseen' : story.items.length ? ' is-seen' : ''}`}
              type="button"
              onClick={() => {
                if (story.items.length) {
                  const at = story.items.findIndex((row) => !row.seen)
                  openReel(story.items[0]?.author.id ?? null, at >= 0 ? at : 0)
                }
              }}
            >
              <span className="story-tile"><img src={assetUrl(story.src, 240) || story.src} alt="" loading="lazy" decoding="async" /><span className="caption">{story.name}</span></span>
            </button>
          ))}
        </div>

        <Segmented
          layoutId="home-feed-tab"
          ariaLabel="فیلتر فید"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'suggested', label: 'برای شما' },
            { value: 'following', label: 'دنبال‌شوندگان' },
          ]}
        />

        {loading && posts.length === 0 && <Skel />}
        {error && <div className="banner banner-danger" style={{ margin: '0 14px 12px' }}>{error}</div>}
        {!loading && posts.length === 0 && (
          <Empty
            icon="users"
            title="هنوز پستی نیست"
            text="همکارها را دنبال کنید یا اولین تجربه حرفه‌ای‌تان را منتشر کنید."
            action={<Link className="btn btn-primary btn-sm" to="/explore">مشاهده اکسپلور</Link>}
          />
        )}

        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              variant={tab === 'following' ? 'following' : 'featured'}
              onComment={() => setCommentId(post.id)}
              onChange={(next) => setPosts((list) => list.map((item) => item.id === next.id ? next : item))}
              onRemove={() => {
                feedGen.current += 1
                setPosts((list) => {
                  const next = list.filter((item) => item.id !== post.id)
                  writePosts(tab, next)
                  return next
                })
              }}
            />
          ))}
        </div>
      </div>

      {reel && (
        <StoryReel
          groups={reel.groups}
          startGroup={reel.group}
          start={reel.index}
          onClose={() => setReel(null)}
          onSeen={(id) => setStories((rows) => {
            const next = rows.map((row) => row.id === id ? { ...row, seen: true } : row)
            writeStories(next)
            return next
          })}
          onDelete={(id) => {
            setStories((rows) => {
              const next = rows.filter((row) => row.id !== id)
              writeStories(next)
              return next
            })
            setReel((current) => {
              if (!current) return null
              const groups = current.groups.map((rows) => rows.filter((row) => row.id !== id)).filter((rows) => rows.length > 0)
              if (groups.length === 0) return null
              const group = Math.min(current.group, groups.length - 1)
              const index = Math.min(current.index, groups[group].length - 1)
              return { groups, group, index }
            })
            void api(`/stories/${id}`, { method: 'DELETE' }).catch((reason) => setError(errText(reason)))
          }}
        />
      )}
      {storyDraft && (
        <StoryStudio
          file={storyDraft}
          busy={storyUploading}
          onCancel={() => setStoryDraft(null)}
          onPublish={(file) => {
            void publishStory(file).then(() => setStoryDraft(null)).catch(() => setError('آپلود استوری ناموفق بود.'))
          }}
        />
      )}
      <CommentSheet
        postId={commentId}
        open={commentId != null}
        onClose={() => setCommentId(null)}
        onChange={(next) => setPosts((list) => {
          const updated = list.map((item) => item.id === next.id ? next : item)
          writePosts(tab, updated)
          return updated
        })}
      />
    </>
  )
}

const MAX_POST_CHARS = 2000

export function Compose() {
  const navigate = useNavigate()
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [slides, setSlides] = useState<import('../post-ui').ComposeSlide[]>([])
  const [coverIndex, setCoverIndex] = useState(0)

  const canSubmit = (body.trim().length > 0 || slides.length > 0 || link.trim().length > 0) && body.length <= MAX_POST_CHARS

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      if (body.trim()) form.set('body', body.trim())
      if (link.trim()) form.set('link_url', link.trim())
      if (title.trim()) form.set('link_title', title.trim())
      slides.forEach((slide) => form.append('media[]', slide.file))
      form.set('cover_index', String(coverIndex))
      const created = await api<{ data: Post }>('/posts', { method: 'POST', body: form })
      void refresh()
      toast.show('پست شما منتشر شد', 'success')
      navigate(`/posts/${created.data.id}`)
    } catch (reason) {
      setError(errText(reason))
    } finally {
      setBusy(false)
    }
  }

  const counterClass = body.length > MAX_POST_CHARS
    ? 'compose-counter is-over'
    : body.length > MAX_POST_CHARS * 0.85
      ? 'compose-counter is-near'
      : 'compose-counter'

  return (
    <>
      <Top title="پست جدید" back />
      <form
        className="screen-body compose-studio"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {user && (
          <div className="compose-author-bar">
            <Person user={user} />
            <span className="chip chip-teal">انتشار عمومی</span>
          </div>
        )}
        <QuotaHint quotaKey="posts" />

        <div className="compose-card">
          <MentionBox
            multiline
            className="compose-textarea"
            value={body}
            onChange={setBody}
            placeholder="تجربه، نکته علمی یا گفت‌وگو با همکاران... برای منشن @ و برای برچسب # بنویسید"
          />
          <div className="compose-foot-meta">
            <span>پشتیبانی از @منشن و #هشتگ</span>
            <span className={counterClass}>{body.length} / {MAX_POST_CHARS}</span>
          </div>
        </div>

        <ComposeMediaPicker slides={slides} coverIndex={coverIndex} onSlides={setSlides} onCover={setCoverIndex} />

        <div className="compose-card">
          <button
            type="button"
            className={linkOpen ? 'compose-link-toggle is-open' : 'compose-link-toggle'}
            onClick={() => setLinkOpen((v) => !v)}
          >
            <span className="row"><Icon name="link" /> افزودن لینک مقاله یا خبر</span>
            <span className="chev" style={{ display: 'inline-flex' }}><Icon name="chevronDown" /></span>
          </button>

          <AnimatePresence initial={false}>
            {linkOpen && (
              <motion.div
                className="stack"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <input className="input ltr" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://..." />
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان لینک (اختیاری)" />
                {link.trim() && (
                  <div className="post-link-card" style={{ margin: 0 }}>
                    <span className="post-link-icon"><Icon name="external" /></span>
                    <span className="post-link-body">
                      <span className="post-link-title">{title.trim() || link.trim()}</span>
                      <span className="post-link-host">{link.trim()}</span>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <div className="error">{error}</div>}
      </form>
      <div className="sticky-submit-bar">
        <Button variant="gradient" block loading={busy} disabled={!canSubmit} type="button" onClick={() => void submit()}>
          <Icon name="send" /> انتشار پست
        </Button>
      </div>
    </>
  )
}

export function PostPage() {
  const { id } = useParams()
  const toast = useToast()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    void api<{ data: Post }>(`/posts/${id}`).then((payload) => {
      setPost(payload.data)
      if (!payload.data.author.is_self) recordDetailView(payload.data.id)
    }).catch((reason) => setError(errText(reason)))
  }, [id])

  return (
    <>
      <Top
        title={post?.author.name || 'پست'}
        back
        action={(
          <button
            className="text-btn"
            type="button"
            onClick={() => void api('/reports', { method: 'POST', body: JSON.stringify({ type: 'post', id: Number(id), reason: 'other' }) })
              .then(() => toast.show('گزارش شما ثبت شد', 'info'))
              .catch((reason) => toast.show(errText(reason), 'error'))}
          >
            گزارش
          </button>
        )}
      />
      <div className="screen-body post-detail-screen">
        {error && <div className="error pad">{error}</div>}
        {post && <InstagramPostDetail post={post} onChange={setPost} onRemove={() => history.back()} />}
      </div>
    </>
  )
}

export function Communities() {
  const [items, setItems] = useState<CommunityCard[]>(() => readCache<CommunityCard[]>(communitiesKey) ?? [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(() => readCache<CommunityCard[]>(communitiesKey) == null)
  useEffect(() => {
    let gone = false
    api<{ data: CommunityCard[] }>('/communities').then((payload) => {
      if (gone) return
      setItems(payload.data)
      writeCache(communitiesKey, payload.data)
      setError('')
    }).catch((reason) => {
      if (!gone && items.length === 0) setError(errText(reason))
    }).finally(() => {
      if (!gone) setLoading(false)
    })
    return () => { gone = true }
  }, [])
  return (
    <>
      <Top title="انجمن‌ها" />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {loading && items.length === 0 && <ListSkel rows={5} />}
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.24) }}
          >
            <Link to={`/communities/${item.slug}`} className="card stack">
              <div className="community-card-head">
                <div className="row">
                  <span className="community-chip">{item.specialty.slice(0, 2)}</span>
                  <div>
                    <b style={{ display: 'block', fontSize: 15 }}>{item.name}</b>
                    <span className="chip chip-blue" style={{ marginTop: 2 }}>{item.specialty}</span>
                  </div>
                </div>
                {item.following && <span className="chip chip-teal"><Icon name="check" /> عضو</span>}
              </div>
              <p className="muted" style={{ fontSize: 13.5 }}>{item.description}</p>
              <div className="community-meta-row">
                <span><Icon name="users" /> {item.members_count} عضو</span>
                <span><Icon name="chat" /> {item.topics_count} موضوع</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  )
}

export function CommunityPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const cachedList = readCache<CommunityCard[]>(communitiesKey)
  const cachedCard = cachedList?.find((row) => row.slug === slug) ?? null
  const [card, setCard] = useState<CommunityCard | null>(cachedCard)
  const [topics, setTopics] = useState<Topic[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!cachedCard)
  const [followBusy, setFollowBusy] = useState(false)

  const load = () => {
    api<{ data: CommunityCard; topics: Topic[] }>(`/communities/${slug}`)
      .then((payload) => { setCard(payload.data); setTopics(payload.topics); setError('') })
      .catch((reason) => setError(errText(reason)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [slug])

  return (
    <>
      <Top title={card?.name || 'انجمن'} back />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {loading && topics.length === 0 && <ListSkel rows={4} />}
        {card && (
          <div className="card stack">
            <div className="row between">
              <span className="chip chip-blue">{card.specialty}</span>
              <span className="faint">{card.members_count} عضو · {card.topics_count} موضوع</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75 }}>{card.description}</p>
            <Button
              variant={card.following ? 'ghost' : 'primary'}
              block
              loading={followBusy}
              type="button"
              onClick={() => {
                setFollowBusy(true)
                void api(`/communities/${slug}/follow`, { method: card.following ? 'DELETE' : 'POST' })
                  .then(() => {
                    toast.show(card.following ? 'انجمن آنفالو شد' : 'به انجمن پیوستید', 'info')
                    load()
                  })
                  .finally(() => setFollowBusy(false))
              }}
            >
              {card.following ? 'عضو انجمن هستید' : 'پیوستن به انجمن'}
            </Button>
          </div>
        )}
        {(user?.can_create_case || user?.can_create_poll) && (
          <div className="two">
            {user?.can_create_case && <Link className="btn btn-ghost" to={`/case?community=${slug}`}><Icon name="book" /> طرح کیس</Link>}
            {user?.can_create_poll && <Link className="btn btn-ghost" to={`/poll?community=${slug}`}><Icon name="chart" /> نظرسنجی</Link>}
          </div>
        )}
        {!loading && topics.length === 0 && (
          <Empty icon="book" title="هنوز موضوعی نیست" text="اولین کیس یا نظرسنجی تخصصی این انجمن را ثبت کنید." />
        )}
        {topics.map((topic) => (
          <Link key={topic.id} to={`/topics/${topic.id}`} className="card stack">
            <div className="row between">
              <div className="row">
                <span className={topic.kind === 'case' ? 'chip chip-coral' : topic.kind === 'poll' ? 'chip chip-violet' : 'chip chip-blue'}>
                  {topic.kind === 'case' ? 'کیس بالینی' : topic.kind === 'poll' ? 'نظرسنجی' : 'بحث'}
                </span>
                {topic.is_demo && <span className="chip">نمونه ساختگی</span>}
              </div>
              <span className="faint">{topic.reply_count ?? 0} پاسخ</span>
            </div>
            <b style={{ fontSize: 15 }}>{topic.title}</b>
          </Link>
        ))}
      </div>
    </>
  )
}

export function TopicPage() {
  const { id } = useParams()
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const replyInputRef = useRef<HTMLTextAreaElement>(null)

  const load = () => {
    api<{ data: Topic; replies: Reply[] }>(`/topics/${id}`)
      .then((payload) => { setTopic(payload.data); setReplies(payload.replies) })
      .catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [id])

  const pickReply = (target: { id: number; name: string }) => {
    setReplyTo(target)
    requestAnimationFrame(() => replyInputRef.current?.focus())
  }

  return (
    <>
      <Top title={topic?.community.name || 'موضوع'} back />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {topic && (
          <article className="card stack">
            {topic.disclaimer && (
              <div className="banner banner-warn">
                <Icon name="shield" />
                <span>{topic.disclaimer}</span>
              </div>
            )}
            {topic.is_demo && (
              <div className="banner banner-success">
                <Icon name="sparkles" />
                <span>این نمونه ساختگی است و توصیه بالینی واقعی نیست.</span>
              </div>
            )}
            <div className="row between">
              <Person user={topic.author} />
              <Badges user={topic.author} />
            </div>
            <h2 style={{ fontSize: 17.5 }}>{topic.title}</h2>
            {topic.body && <p style={{ lineHeight: 1.85, fontSize: 14.2 }}>{topic.body}</p>}
            {topic.poll && (
              <div className="poll">
                {topic.poll.options.map((option) => {
                  const voted = topic.poll?.voted_option_id === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={voted ? 'poll-opt is-voted' : 'poll-opt'}
                      disabled={!user?.can_create_poll}
                      onClick={() => void api(`/topics/${id}/vote`, { method: 'POST', body: JSON.stringify({ option_id: option.id }) })
                        .then(() => {
                          toast.show('رأی شما ثبت شد', 'success')
                          load()
                        })
                        .catch((reason) => toast.show(errText(reason), 'error'))}
                    >
                      <motion.i
                        className="poll-opt-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${option.percent}%` }}
                        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                      />
                      <span className="poll-opt-inner">
                        <b>{option.label}{voted ? ' ✓' : ''}</b>
                        <em>{option.percent}٪</em>
                      </span>
                    </button>
                  )
                })}
                <span className="faint" style={{ marginTop: 2 }}>مجموع آرا: {topic.poll.total} رأی</span>
              </div>
            )}
          </article>
        )}

        {replies.map((reply) => {
          const thread = { id: reply.id, name: reply.author.name }
          return (
            <div key={reply.id} className="card stack">
              <Person user={reply.author} />
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{reply.body}</p>
              <div className="topic-reply-actions">
                <button type="button" className="ig-reply-btn" onClick={() => pickReply(thread)}>پاسخ</button>
              </div>
              {reply.replies && reply.replies.length > 0 && (
                <div className="topic-reply-nested stack">
                  {reply.replies.map((child) => (
                    <div key={child.id} className="ig-comment ig-comment--nested">
                      <div className="ig-comment-body">
                        <div className="ig-comment-bubble">
                          <div className="ig-comment-head">
                            <Person user={child.author} />
                          </div>
                          <p className="ig-comment-text">{child.body}</p>
                        </div>
                        <div className="ig-comment-meta">
                          <button type="button" className="ig-reply-btn" onClick={() => pickReply(thread)}>پاسخ</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <form className="card stack" onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim() || busy) return
          setBusy(true)
          void api(`/topics/${id}/replies`, {
            method: 'POST',
            body: JSON.stringify(replyTo ? { body: text.trim(), parent_id: replyTo.id } : { body: text.trim() }),
          })
            .then(() => {
              setText('')
              setReplyTo(null)
              toast.show('پاسخ شما ثبت شد', 'success')
              void refresh()
              load()
            })
            .catch((reason) => setError(errText(reason)))
            .finally(() => setBusy(false))
        }}>
          {replyTo && (
            <div className="ig-reply-strip" style={{ borderRadius: 12 }}>
              <span>پاسخ به <b>{replyTo.name}</b></span>
              <button type="button" className="text-btn" onClick={() => setReplyTo(null)}>انصراف</button>
            </div>
          )}
          <QuotaHint quotaKey="comments" />
          <textarea
            ref={replyInputRef}
            className="textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={replyTo ? `پاسخ به ${replyTo.name}...` : 'دیدگاه تخصصی خود را بنویسید...'}
          />
          <Button variant="primary" block loading={busy} disabled={!text.trim()} type="submit">ارسال پاسخ</Button>
        </form>
      </div>
    </>
  )
}

export function CasePage() {
  return <TopicForm kind="case" title="طرح کیس ناشناس" />
}

export function PollPage() {
  return <TopicForm kind="poll" title="نظرسنجی تخصصی" />
}

function TopicForm({ kind, title }: { kind: 'case' | 'poll'; title: string }) {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const toast = useToast()
  const params = new URLSearchParams(window.location.search)
  const [slug, setSlug] = useState(params.get('community') || 'cardiology')
  const [communities, setCommunities] = useState<CommunityCard[]>([])
  const [options, setOptions] = useState(['', ''])
  const [topicTitle, setTopicTitle] = useState('')
  const [topicBody, setTopicBody] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ data: CommunityCard[] }>('/communities').then((payload) => setCommunities(payload.data)).catch(() => undefined)
  }, [])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
    if (kind === 'poll' && cleanOptions.length < 2) {
      setError('حداقل دو گزینه برای نظرسنجی وارد کنید.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      kind,
      title: topicTitle.trim(),
      body: topicBody.trim(),
      anonymous: kind === 'case' ? anonymous : false,
      disclaimer_accepted: disclaimerAccepted,
      options: kind === 'poll' ? cleanOptions : undefined,
    }
    void api<{ data: Topic }>(`/communities/${slug}/topics`, { method: 'POST', body: JSON.stringify(payload) })
      .then((created) => {
        void refresh()
        toast.show(kind === 'case' ? 'کیس بالینی منتشر شد' : 'نظرسنجی منتشر شد', 'success')
        navigate(`/topics/${created.data.id}`)
      })
      .catch((reason) => setError(errText(reason)))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <Top title={title} back />
      <form id="topic-form" className="screen-body pad stack" style={{ paddingBottom: 100 }} onSubmit={submit}>
        <div className="banner banner-warn">
          <Icon name="shield" />
          <span>اطلاعات هویتی بیمار، چهره، کد ملی و شماره تماس را ننویسید. این فضا جایگزین ویزیت نیست.</span>
        </div>
        <QuotaHint quotaKey="topics" />

        <div className="card stack">
          <Field label="انجمن تخصصی" htmlFor="topic-community">
            <select id="topic-community" className="select" value={slug} onChange={(event) => setSlug(event.target.value)}>
              {communities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </Field>

          <Field label="عنوان" htmlFor="topic-title">
            <input
              id="topic-title"
              className="input"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder={kind === 'case' ? 'مثلاً بیمار ۵۴ ساله با درد قفسه سینه' : 'پرسش نظرسنجی تخصصی'}
              required
            />
          </Field>

          <Field label={kind === 'case' ? 'شرح بالینی بدون شناسه' : 'توضیح تکمیلی'} htmlFor="topic-body">
            <textarea
              id="topic-body"
              className="textarea"
              value={topicBody}
              onChange={(e) => setTopicBody(e.target.value)}
              placeholder={kind === 'case' ? 'یافته‌ها، علائم و سؤال بالینی بدون هیچ اطلاعات هویتی...' : 'زمینه و جزئیات نظرسنجی...'}
              required
            />
          </Field>
        </div>

        {kind === 'poll' && (
          <div className="card stack">
            <div className="row between">
              <b style={{ fontSize: 14 }}>گزینه‌های نظرسنجی</b>
              <span className="faint">{options.length} از ۶</span>
            </div>
            <AnimatePresence initial={false}>
              {options.map((option, index) => (
                <motion.div
                  key={index}
                  className="poll-option-row"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <input
                    className="input"
                    value={option}
                    placeholder={`گزینه ${index + 1}`}
                    required={index < 2}
                    onChange={(event) => setOptions((list) => list.map((item, i) => (i === index ? event.target.value : item)))}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="poll-option-remove"
                      aria-label={`حذف گزینه ${index + 1}`}
                      onClick={() => setOptions((list) => list.filter((_, i) => i !== index))}
                    >
                      <Icon name="trash" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {options.length < 6 && (
              <Button variant="ghost" block type="button" onClick={() => setOptions((list) => [...list, ''])}>
                <Icon name="plus" /> افزودن گزینه جدید
              </Button>
            )}
          </div>
        )}

        <div className="stack">
          {kind === 'case' && (
            <label className="check">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span>انتشار بدون نام (نام شما نمایش داده نمی‌شود)</span>
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} required />
            <span>می‌دانم این محتوا توصیه درمانی یا اجماع علمی نیست.</span>
          </label>
        </div>

        {error && <div className="error">{error}</div>}
      </form>
      <div className="sticky-submit-bar">
        <Button variant="primary" block loading={busy} type="submit" form="topic-form">
          <Icon name="send" /> انتشار {kind === 'case' ? 'کیس' : 'نظرسنجی'}
        </Button>
      </div>
    </>
  )
}
