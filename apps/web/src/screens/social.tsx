import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, assetUrl } from '../api'
import { useAuth } from '../auth'
import type { Conversation, Notice, Post, Story, Topic, Reply, CommunityCard } from '../types'
import { Badges, Empty, ListSkel, MentionBox, Person, PostCard, Sheet, Skel, Top, errText } from '../ui'
import { ComposeMediaField as ComposeMediaPicker, InstagramPostDetail } from '../post-ui'
import { Brand, Icon } from '../icons'
import { readCache, writeCache } from '../cache'
import { buildStoryTiles, mergeStoryLists, myStories } from '../stories'
import { StoryStudio } from '../story-studio'

const communitiesKey = 'tebyar-communities'

const feedMemory: { suggested?: Post[]; following?: Post[]; stories?: Story[] } = {}
const storiesKey = 'tebyar-stories'

function readStories(): Story[] {
  if (feedMemory.stories) return feedMemory.stories
  try {
    const raw = sessionStorage.getItem(storiesKey)
    if (!raw) return []
    const rows = JSON.parse(raw) as Story[]
    feedMemory.stories = rows
    return rows
  } catch {
    return []
  }
}

function writeStories(rows: Story[]) {
  feedMemory.stories = rows
  sessionStorage.setItem(storiesKey, JSON.stringify(rows))
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
    void api<{ data: Conversation[] }>('/conversations')
      .then((payload) => setMessages(payload.data.filter((item) => item.unread).length))
      .catch(() => undefined)
    void api<{ data: Notice[] }>('/notifications')
      .then((payload) => setNotices(payload.data.filter((item) => !item.read_at).length))
      .catch(() => undefined)
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
  const items = groups[group] ?? []
  const story = items[index]

  const go = (dir: 1 | -1) => {
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
    const timer = window.setTimeout(() => go(1), 5000)
    return () => window.clearTimeout(timer)
  }, [index, group])

  useEffect(() => {
    document.body.dataset.cover = 'story'
    return () => { delete document.body.dataset.cover }
  }, [])

  if (!story) return null
  return createPortal(
    <div className="story-viewer is-open">
      <div className="progress">
        {items.map((item, i) => (
          <span key={item.id || i} className={i === index ? 'active' : i < index ? 'done' : ''}>
            <i />
          </span>
        ))}
      </div>
      <div className="who">
        <b>{story.author.name}</b>
        <span className="story-who-actions">
          {story.mine && story.id > 0 && (
            <button className="icon-btn" type="button" aria-label="گزینه‌های استوری" onClick={(event) => { event.stopPropagation(); setMenu(true) }}>
              <Icon name="more" />
            </button>
          )}
          <button className="icon-btn" type="button" onClick={onClose} aria-label="بستن"><Icon name="back" /></button>
        </span>
      </div>
      {note && <p className="story-note">{note}</p>}
      <div className="media"><img src={assetUrl(story.media_url) || story.media_url} alt="" onError={() => setNote('این تصویر روی گوشی باز نشد.')} /></div>
      <button className="story-hit story-hit-next" type="button" aria-label="بعدی" onClick={() => go(1)} />
      <button className="story-hit story-hit-prev" type="button" aria-label="قبلی" onClick={() => go(-1)} />
      {menu && (
        <Sheet front onClose={() => setMenu(false)}>
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
      )}
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
  const [fresh, setFresh] = useState(false)
  const [error, setError] = useState('')
  const [reel, setReel] = useState<{ groups: Story[][]; group: number; index: number } | null>(null)
  const [storyUploading, setStoryUploading] = useState(false)
  const [storyPreview, setStoryPreview] = useState<string | null>(null)
  const [storyDraft, setStoryDraft] = useState<File | null>(null)
  const { user } = useAuth()
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
      setFresh(false)
    } else {
      setPosts([])
      setLoading(true)
      setFresh(true)
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
    return () => { gone = true }
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
      setStories((current) => {
        const next = mergeStoryLists(current, storyList.data)
        writeStories(next)
        return next
      })
      URL.revokeObjectURL(preview)
      setStoryPreview(null)
    } catch {
      setError('آپلود استوری ناموفق بود.')
    } finally {
      setStoryUploading(false)
    }
  }

  const tiles = buildStoryTiles(stories, user, storiesLoaded)
  const ownCover = storyPreview || assetUrl(mine[mine.length - 1]?.media_url)
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
            <Icon name="chat" />
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
                <img src={ownCover} alt="" />
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
              className={`story story-ring-in${story.unseen ? ' is-unseen' : story.items.length ? ' is-seen' : ''}`}
              type="button"
              onClick={() => {
                if (story.items.length) {
                  const at = story.items.findIndex((row) => !row.seen)
                  openReel(story.items[0]?.author.id ?? null, at >= 0 ? at : 0)
                }
              }}
            >
              <span className="story-tile"><img src={assetUrl(story.src) || story.src} alt="" /><span className="caption">{story.name}</span></span>
            </button>
          ))}
        </div>
        <div className="filters pad">
          <button className={tab === 'following' ? 'filter-chip is-on' : 'filter-chip'} type="button" onClick={() => setTab('following')}>دنبال‌شوندگان</button>
          <button className={tab === 'suggested' ? 'filter-chip is-on' : 'filter-chip'} type="button" onClick={() => setTab('suggested')}>برای شما</button>
        </div>
        {loading && posts.length === 0 && <Skel />}
        {error && <div className="banner banner-danger">{error}</div>}
        {!loading && posts.length === 0 && <Empty title="هنوز پستی نیست" text="همکارها را دنبال کنید یا اولین تجربه حرفه‌ای‌تان را بنویسید." />}
        <div className={fresh ? 'feed-in' : undefined}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              variant={tab === 'following' ? 'following' : 'featured'}
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
    </>
  )
}

export function Compose() {
  const navigate = useNavigate()
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [slides, setSlides] = useState<import('../post-ui').ComposeSlide[]>([])
  const [coverIndex, setCoverIndex] = useState(0)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      if (body) form.set('body', body)
      if (link) form.set('link_url', link)
      if (title) form.set('link_title', title)
      slides.forEach((slide) => form.append('media[]', slide.file))
      form.set('cover_index', String(coverIndex))
      const created = await api<{ data: Post }>('/posts', { method: 'POST', body: form })
      navigate(`/posts/${created.data.id}`)
    } catch (reason) {
      setError(errText(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Top title="انتشار" back action={<button className="icon-btn" type="button" aria-label="انتشار" disabled={busy} onClick={() => void submit()}><Icon name="send" /></button>} />
      <form className="screen-body compose-studio" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <ComposeMediaPicker slides={slides} coverIndex={coverIndex} onSlides={setSlides} onCover={setCoverIndex} />
        <div className="compose-caption">
          <MentionBox multiline className="area" value={body} onChange={setBody} placeholder="چه چیزی برای همکاران می‌نویسید؟ با @ منشن کنید" />
        </div>
        <details className="compose-extra">
          <summary>لینک مقاله یا خبر</summary>
          <input className="field" value={link} onChange={(event) => setLink(event.target.value)} placeholder="نشانی" />
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان لینک" />
        </details>
        {error && <div className="error">{error}</div>}
      </form>
    </>
  )
}

export function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    void api<{ data: Post }>(`/posts/${id}`).then((payload) => setPost(payload.data)).catch((reason) => setError(errText(reason)))
  }, [id])

  return (
    <>
      <Top title={post?.author.name || 'پست'} back action={<button className="text-btn" type="button" onClick={() => void api('/reports', { method: 'POST', body: JSON.stringify({ type: 'post', id: Number(id), reason: 'other' }) })}>گزارش</button>} />
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
        {items.map((item) => (
          <Link key={item.id} to={`/communities/${item.slug}`} className="card stack">
            <div className="row between"><b>{item.name}</b><span className="chip">{item.specialty}</span></div>
            <p className="muted">{item.description}</p>
            <span className="faint">{item.members_count} عضو · {item.topics_count} موضوع</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function CommunityPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const cachedList = readCache<CommunityCard[]>(communitiesKey)
  const cachedCard = cachedList?.find((row) => row.slug === slug) ?? null
  const [card, setCard] = useState<CommunityCard | null>(cachedCard)
  const [topics, setTopics] = useState<Topic[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!cachedCard)

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
            <p>{card.description}</p>
            <button className="btn" type="button" onClick={() => void api(`/communities/${slug}/follow`, { method: card.following ? 'DELETE' : 'POST' }).then(load)}>
              {card.following ? 'دنبال می‌کنید' : 'دنبال کردن انجمن'}
            </button>
          </div>
        )}
        <div className="row">
          {user?.can_create_case && <Link className="btn" to={`/case?community=${slug}`}>طرح کیس</Link>}
          {user?.can_create_poll && <Link className="btn" to={`/poll?community=${slug}`}>نظرسنجی</Link>}
        </div>
        {topics.map((topic) => (
          <Link key={topic.id} to={`/topics/${topic.id}`} className="card stack">
            <div className="chips">
              <span className="chip">{topic.kind === 'case' ? 'کیس' : topic.kind === 'poll' ? 'نظرسنجی' : 'بحث'}</span>
              {topic.is_demo && <span className="chip coral">نمونه ساختگی</span>}
            </div>
            <b>{topic.title}</b>
            <span className="muted">{topic.reply_count} پاسخ</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function TopicPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    api<{ data: Topic; replies: Reply[] }>(`/topics/${id}`)
      .then((payload) => { setTopic(payload.data); setReplies(payload.replies) })
      .catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [id])

  return (
    <>
      <Top title="موضوع" back />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {topic && (
          <article className="card stack">
            {topic.disclaimer && <div className="banner">{topic.disclaimer}</div>}
            {topic.is_demo && <div className="banner calm">این نمونه ساختگی است و توصیه بالینی واقعی نیست.</div>}
            <Person user={topic.author} />
            <Badges user={topic.author} />
            <h2>{topic.title}</h2>
            <p style={{ lineHeight: 1.8 }}>{topic.body}</p>
            {topic.poll && (
              <div className="poll">
                {topic.poll.options.map((option) => (
                  <button key={option.id} type="button" disabled={!user?.can_create_poll} onClick={() => void api(`/topics/${id}/vote`, { method: 'POST', body: JSON.stringify({ option_id: option.id }) }).then(load)}>
                    <i style={{ width: `${option.percent}%` }} />
                    <span><b>{option.label}</b><em>{option.percent}٪</em></span>
                  </button>
                ))}
              </div>
            )}
          </article>
        )}
        {replies.map((reply) => (
          <div key={reply.id} className="card stack">
            <Person user={reply.author} />
            <p>{reply.body}</p>
          </div>
        ))}
        <form className="stack" onSubmit={(event) => {
          event.preventDefault()
          void api(`/topics/${id}/replies`, { method: 'POST', body: JSON.stringify({ body: text }) }).then(() => { setText(''); load() }).catch((reason) => setError(errText(reason)))
        }}>
          <textarea className="area" value={text} onChange={(event) => setText(event.target.value)} placeholder="پاسخ شما" />
          <button className="btn primary" type="submit">ارسال پاسخ</button>
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
  const params = new URLSearchParams(window.location.search)
  const [slug, setSlug] = useState(params.get('community') || 'cardiology')
  const [communities, setCommunities] = useState<CommunityCard[]>([])
  const [options, setOptions] = useState(['', ''])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ data: CommunityCard[] }>('/communities').then((payload) => setCommunities(payload.data)).catch(() => undefined)
  }, [])

  return (
    <>
      <Top title={title} back />
      <form className="screen-body pad stack" onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const payload = {
          kind,
          title: String(form.get('title') || ''),
          body: String(form.get('body') || ''),
          anonymous: form.get('anonymous') === 'on',
          disclaimer_accepted: form.get('disclaimer_accepted') === 'on',
          options: kind === 'poll' ? options.filter(Boolean) : undefined,
        }
        void api<{ data: Topic }>(`/communities/${slug}/topics`, { method: 'POST', body: JSON.stringify(payload) })
          .then((created) => navigate(`/topics/${created.data.id}`))
          .catch((reason) => setError(errText(reason)))
      }}>
        <div className="banner">اطلاعات هویتی بیمار، چهره، کد ملی و شماره تماس را ننویسید. این فضا جایگزین ویزیت نیست.</div>
        <label className="lbl">انجمن
          <select className="select" value={slug} onChange={(event) => setSlug(event.target.value)}>
            {communities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <input className="field" name="title" placeholder="عنوان" required />
        <textarea className="area" name="body" placeholder="شرح بدون شناسه" required />
        {kind === 'poll' && options.map((option, index) => (
          <input key={index} className="field" value={option} placeholder={`گزینه ${index + 1}`} onChange={(event) => setOptions((list) => list.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
        ))}
        {kind === 'poll' && <button className="btn" type="button" onClick={() => setOptions((list) => [...list, ''])}>گزینه جدید</button>}
        {kind === 'case' && <label className="check"><input name="anonymous" type="checkbox" defaultChecked /> انتشار بدون نام</label>}
        <label className="check"><input name="disclaimer_accepted" type="checkbox" required /> می‌دانم این محتوا توصیه درمانی یا اجماع علمی نیست.</label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary full" type="submit">انتشار</button>
      </form>
    </>
  )
}
