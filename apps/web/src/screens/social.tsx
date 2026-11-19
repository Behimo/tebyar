import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Post, Story, Topic, Reply, CommunityCard } from '../types'
import { Badges, Empty, Person, PostCard, Skel, Top, errText } from '../ui'
import { Brand, Icon } from '../icons'

const sampleStories = [
  { name: 'سارا', src: '/design/story-sara-coffee.jpg' },
  { name: 'محمد', src: '/design/story-mohammad.jpg' },
  { name: 'نیلوفر', src: '/design/story-niloufar.jpg' },
  { name: 'کسری', src: '/design/story-kasra.jpg' },
]

const feedMemory: { suggested?: Post[]; following?: Post[]; stories?: Story[] } = {}

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

export function Home() {
  const [tab, setTab] = useState<'suggested' | 'following'>('suggested')
  const [posts, setPosts] = useState<Post[]>(() => readPosts('suggested') ?? [])
  const [stories, setStories] = useState<Story[]>(() => feedMemory.stories ?? [])
  const [loading, setLoading] = useState(() => readPosts('suggested') == null)
  const [fresh, setFresh] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState<Story | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    let gone = false
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
      if (gone) return
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
      feedMemory.stories = storyList.data
      setStories(storyList.data)
    }).catch(() => undefined)
    return () => { gone = true }
  }, [])

  const publishStory = async (file: File) => {
    const body = new FormData()
    body.append('media', file)
    await api('/stories', { method: 'POST', body })
    setTab((current) => current)
    const storyList = await api<{ data: Story[] }>('/stories')
    setStories(storyList.data)
  }

  const tiles = stories.length > 0
    ? stories.map((story) => ({ id: String(story.id), name: story.author.name.split(' ').slice(-1)[0] || story.author.name, src: story.media_url, live: story }))
    : sampleStories.map((story) => ({ id: story.name, name: story.name, src: story.src, live: null as Story | null }))

  return (
    <>
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <Link className="icon-btn" to="/search" aria-label="جست‌وجوی پزشکان"><Icon name="search" /></Link>
          <Link className="icon-btn" to="/notifications" aria-label="اعلان‌ها"><Icon name="bell" /><span className="badge">۱</span></Link>
        </div>
      </header>
      <div className="screen-body">
        <div className="stories" dir="rtl" aria-label="استوری‌ها">
          <label className="story story-own">
            <span className="story-tile"><span className="plus">+</span></span>
            <span className="story-name">استوری شما</span>
            <input hidden type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void publishStory(file)
            }} />
          </label>
          {tiles.filter((story) => story.live?.author.id !== user?.id).map((story) => (
            <button key={story.id} className="story" type="button" onClick={() => {
              if (story.live) {
                setActive(story.live)
                void api(`/stories/${story.live.id}/view`, { method: 'POST' })
              } else {
                setActive({ id: 0, media_url: story.src, expires_at: '', seen: true, mine: false, author: { name: story.name, avatar_url: null } as Story['author'] })
              }
            }}>
              <span className="story-tile"><img src={story.src} alt="" /></span>
              <span className="story-name">{story.name}</span>
            </button>
          ))}
        </div>
        <div className="home-tabs">
          <button className={tab === 'suggested' ? 'is-on' : ''} type="button" onClick={() => setTab('suggested')}>برای شما</button>
          <button className={tab === 'following' ? 'is-on' : ''} type="button" onClick={() => setTab('following')}>دنبال‌شوندگان</button>
          <Link to="/jobs">کاریابی</Link>
        </div>
        {loading && posts.length === 0 && <Skel />}
        {error && <div className="banner banner-danger">{error}</div>}
        {!loading && posts.length === 0 && <Empty title="هنوز پستی نیست" text="همکارها را دنبال کنید یا اولین تجربه حرفه‌ای‌تان را بنویسید." />}
        <div className={fresh ? 'feed-in' : undefined}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChange={(next) => setPosts((list) => list.map((item) => item.id === next.id ? next : item))} />
          ))}
        </div>
      </div>
      {active && (
        <div className="story-viewer is-open">
          <div className="progress"><span className="active"><i /></span></div>
          <div className="who"><b>{active.author.name}</b><button className="icon-btn" type="button" onClick={() => setActive(null)} aria-label="بستن"><Icon name="back" /></button></div>
          <div className="media"><img src={active.media_url} alt="" /></div>
        </div>
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

  const submit = async (form: FormData) => {
    setBusy(true)
    setError('')
    try {
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
      <Top title="انتشار پست" back />
      <form className="screen-body pad stack" onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        if (body) form.set('body', body)
        if (link) form.set('link_url', link)
        if (title) form.set('link_title', title)
        void submit(form)
      }}>
        <textarea className="area" name="body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="تجربه کاری، خبر یا نکته‌ای برای همکاران..." />
        <label className="lbl">تصویر یا ویدئو<input className="field" name="media[]" type="file" accept="image/*,video/mp4,video/webm" multiple /></label>
        <input className="field" value={link} onChange={(event) => setLink(event.target.value)} placeholder="لینک مقاله یا خبر" />
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان لینک" />
        {error && <div className="error">{error}</div>}
        <button className="btn primary full" disabled={busy} type="submit">{busy ? 'در حال انتشار...' : 'انتشار'}</button>
      </form>
    </>
  )
}

export function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')

  const load = () => {
    api<{ data: Post }>(`/posts/${id}`).then((payload) => setPost(payload.data)).catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [id])

  return (
    <>
      <Top title="پست" back action={<button className="text-btn" type="button" onClick={() => void api('/reports', { method: 'POST', body: JSON.stringify({ type: 'post', id: Number(id), reason: 'other' }) })}>گزارش</button>} />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {post && <PostCard post={post} onChange={setPost} />}
        {post?.comments?.map((comment) => (
          <div key={comment.id} className="card stack">
            <Person user={comment.author} />
            <p>{comment.body}</p>
            {comment.replies?.map((reply) => (
              <div key={reply.id} className="link-card">
                <b>{reply.author.name}</b>
                <p>{reply.body}</p>
              </div>
            ))}
          </div>
        ))}
        <form className="stack" onSubmit={(event) => {
          event.preventDefault()
          void api(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ body: text }) }).then(() => {
            setText('')
            load()
          }).catch((reason) => setError(errText(reason)))
        }}>
          <textarea className="area" value={text} onChange={(event) => setText(event.target.value)} placeholder="نظر شما" />
          <button className="btn primary" type="submit">ثبت نظر</button>
        </form>
      </div>
    </>
  )
}

export function Communities() {
  const [items, setItems] = useState<CommunityCard[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    api<{ data: CommunityCard[] }>('/communities').then((payload) => setItems(payload.data)).catch((reason) => setError(errText(reason)))
  }, [])
  return (
    <>
      <Top title="انجمن‌ها" />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
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
  const [card, setCard] = useState<CommunityCard | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [error, setError] = useState('')

  const load = () => {
    api<{ data: CommunityCard; topics: Topic[] }>(`/communities/${slug}`)
      .then((payload) => { setCard(payload.data); setTopics(payload.topics) })
      .catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [slug])

  return (
    <>
      <Top title={card?.name || 'انجمن'} back />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
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
