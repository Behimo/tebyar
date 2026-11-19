import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, when } from '../api'
import { readCache, writeCache } from '../cache'
import { useAuth } from '../auth'
import { Icon } from '../icons'
import type { ChatMessage, CommunityCard, Conversation, Entry, Me, Post, Topic, UserCard } from '../types'
import { Avatar, Empty, ListSkel, PostCard, Sheet, Top, VerifiedSeal, errText } from '../ui'
import { CommentSheet, PostGrid, PostViewer } from '../post-ui'
import { realtime } from '../realtime'

const conversationsKey = 'tebyar-conversations'

function chatKey(id: string) {
  return `tebyar-chat-${id}`
}

const entryLabels: Record<string, string> = {
  education: 'تحصیلات',
  experience: 'محل کار',
  publication: 'مقالات',
  certificate: 'مدرک‌ها',
  talk: 'سخنرانی‌ها',
  skill: 'مهارت‌ها',
}

export function Messages() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<Conversation[]>(() => readCache<Conversation[]>(conversationsKey) ?? [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(() => readCache<Conversation[]>(conversationsKey) == null)
  const [query, setQuery] = useState('')
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberHits, setMemberHits] = useState<UserCard[]>([])
  const [picked, setPicked] = useState<UserCard[]>([])

  const load = () => {
    void api<{ data: Conversation[] }>('/conversations').then((payload) => {
      setItems(payload.data)
      writeCache(conversationsKey, payload.data)
      setError('')
    }).catch((reason) => {
      if (items.length === 0) setError(errText(reason))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const client = realtime()
    if (!client || !user?.id) return
    const channel = client.private(`user.${user.id}`)
    channel.listen('.ConversationUpdated', load)
    return () => { channel.stopListening('.ConversationUpdated'); client.leave(`private-user.${user.id}`) }
  }, [user?.id])

  useEffect(() => {
    if (!groupOpen) return
    const timer = window.setTimeout(() => {
      const q = memberQuery.trim()
      void api<{ data: UserCard[] }>(`/connections${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        .then((payload) => setMemberHits(payload.data))
        .catch(() => setMemberHits([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [groupOpen, memberQuery])

  const needle = query.trim()
  const filtered = needle
    ? items.filter((item) => {
      const title = item.type === 'group' ? item.title || item.peer.name : item.peer.name
      return title.includes(needle) || item.last_message?.body?.includes(needle)
    })
    : items

  const rowTitle = (item: Conversation) => (item.type === 'group' ? item.title || 'گروه' : item.peer.name)
  const rowAvatar = (item: Conversation) => (item.type === 'group' && item.members?.[0] ? item.members[0] : item.peer)

  return (
    <>
      <Top
        title="پیام‌ها"
        action={(
          <button className="icon-btn" type="button" aria-label="گروه جدید" onClick={() => setGroupOpen(true)}>
            <Icon name="users" />
          </button>
        )}
      />
      <div className="screen-body pad messages-list">
        <div className="field">
          <label className="sr-only" htmlFor="qm">جست‌وجوی گفتگو</label>
          <input className="input" id="qm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در پیام‌ها..." />
        </div>
        {error && <div className="error">{error}</div>}
        {loading && items.length === 0 && <ListSkel rows={8} />}
        {!loading && filtered.length === 0 && <Empty title="پیامی نیست" text="گفتگوهای خصوصی و گروهی اینجا فهرست می‌شوند." />}
        {filtered.map((item) => (
          <button
            key={item.id}
            className="list-row"
            type="button"
            onPointerDown={() => {
              void api<{ data: ChatMessage[]; peer: UserCard | null; conversation: Conversation }>(`/conversations/${item.id}/messages`)
                .then((payload) => writeCache(chatKey(String(item.id)), payload))
                .catch(() => undefined)
            }}
            onClick={() => navigate(`/messages/${item.id}`)}
          >
            <Avatar user={rowAvatar(item)} />
            <div className="body">
              <div className="title">{rowTitle(item)}{item.type === 'group' && <span className="muted"> · گروه</span>}</div>
              <div className="sub">{item.last_message?.body || '—'}</div>
            </div>
            <span className="time">{item.last_message?.created_at ? when(item.last_message.created_at) : ''}</span>
            {item.unread && <span className="unread-dot" aria-label="خوانده‌نشده" />}
          </button>
        ))}
      </div>
      {groupOpen && (
        <Sheet onClose={() => setGroupOpen(false)}>
          <div className="stack">
            <h2>گروه جدید</h2>
            <input className="input" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="نام گروه" />
            <input className="input" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="جست‌وجو بین دنبال‌کننده‌ها و دنبال‌شده‌ها" />
            {memberHits.length === 0 && <p className="muted">کسی در دنبال‌کردن‌های شما پیدا نشد.</p>}
            {memberHits.map((doctor) => (
              <button
                key={doctor.id}
                className="sheet-item"
                type="button"
                onClick={() => {
                  if (doctor.id && !picked.some((row) => row.id === doctor.id)) setPicked((rows) => [...rows, doctor])
                }}
              >
                {doctor.name}
              </button>
            ))}
            {picked.length > 0 && <p className="muted">اعضا: {picked.map((row) => row.name).join('، ')}</p>}
            <button
              className="btn btn-primary btn-block"
              type="button"
              onClick={() => {
                const ids = picked.map((row) => row.id).filter((value): value is number => value != null)
                if (!groupTitle.trim() || ids.length === 0) return
                void api<{ data: Conversation }>('/conversations/groups', {
                  method: 'POST',
                  body: JSON.stringify({ title: groupTitle.trim(), user_ids: ids }),
                }).then((payload) => {
                  setGroupOpen(false)
                  setGroupTitle('')
                  setPicked([])
                  navigate(`/messages/${payload.data.id}`)
                }).catch((reason) => setError(errText(reason)))
              }}
            >
              ساخت گروه
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}

export function Chat() {
  const { id } = useParams()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const cachedThread = id ? readCache<{ data: ChatMessage[]; peer: UserCard | null; conversation: Conversation }>(chatKey(id)) : null
  const [messages, setMessages] = useState<ChatMessage[]>(() => cachedThread?.data ?? [])
  const [peer, setPeer] = useState<UserCard | null>(() => cachedThread?.peer ?? null)
  const [conversation, setConversation] = useState<Conversation | null>(() => cachedThread?.conversation ?? null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [manage, setManage] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberHits, setMemberHits] = useState<UserCard[]>([])

  const load = () => {
    if (!id) return
    api<{ data: ChatMessage[]; peer: UserCard | null; conversation: Conversation }>(`/conversations/${id}/messages`)
      .then((payload) => {
        setMessages(payload.data)
        setPeer(payload.peer)
        setConversation(payload.conversation)
        writeCache(chatKey(id), payload)
      })
      .catch((reason) => setError(errText(reason)))
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (realtime()) return
    const timer = window.setInterval(load, 8000)
    return () => window.clearInterval(timer)
  }, [id])

  useEffect(() => {
    const client = realtime()
    if (!client || !id) return
    const channel = client.private(`conversation.${id}`)
    const onMessage = (payload: ChatMessage & { conversation_id: number; sender_id: number; sender_name?: string }) => {
      const mine = payload.sender_id === user?.id
      setMessages((rows) => {
        if (rows.some((row) => row.id === payload.id)) return rows
        return [...rows, {
          id: payload.id,
          body: payload.body,
          sender_id: payload.sender_id,
          sender_name: payload.sender_name ?? null,
          attachment_url: payload.attachment_url,
          attachment_name: payload.attachment_name,
          mine,
          read: false,
          created_at: payload.created_at,
        }]
      })
    }
    channel.listen('.MessageSent', onMessage)
    return () => { channel.stopListening('.MessageSent'); client.leave(`private-conversation.${id}`) }
  }, [id, user?.id])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages])

  const title = conversation?.type === 'group'
    ? conversation.title || 'گروه'
    : peer?.name || 'گفتگو'

  useEffect(() => {
    if (!manage) return
    const timer = window.setTimeout(() => {
      const q = memberQuery.trim()
      void api<{ data: UserCard[] }>(`/connections${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        .then((payload) => setMemberHits(payload.data))
        .catch(() => setMemberHits([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [manage, memberQuery])

  return (
    <>
      <Top
        title={title}
        back
        action={conversation?.type === 'group' && conversation.am_admin
          ? <button className="text-btn" type="button" onClick={() => setManage(true)}>اعضا</button>
          : undefined}
      />
      <div className="screen-body chat-screen">
        <div className="thread" ref={threadRef}>
          {error && <div className="error">{error}</div>}
          {messages.map((message) => (
            <div key={message.id} className={message.mine ? 'bubble me' : 'bubble them'}>
              {!message.mine && message.sender_name && <div className="meta sender">{message.sender_name}</div>}
              {message.body && <div>{message.body}</div>}
              {message.attachment_url && (
                <a className="attach" href={message.attachment_url} target="_blank" rel="noreferrer">
                  <Icon name="file" />
                  {message.attachment_name || 'پیوست'}
                </a>
              )}
              <div className="meta">
                {when(message.created_at)}
                {message.mine && message.read ? ' · خوانده شد' : ''}
              </div>
            </div>
          ))}
        </div>
        <form
          className="composer-bar"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            if (text) form.set('body', text)
            void api<{ data: ChatMessage }>(`/conversations/${id}/messages`, { method: 'POST', body: form })
              .then((sent) => {
                setMessages((rows) => [...rows, { ...sent.data, mine: true }])
                setText('')
                if (fileRef.current) fileRef.current.value = ''
              })
              .catch((reason) => setError(errText(reason)))
          }}
        >
          <button className="icon-btn" type="button" aria-label="پیوست" onClick={() => fileRef.current?.click()}>
            <Icon name="file" />
          </button>
          <input ref={fileRef} className="composer-file" name="attachment" type="file" accept="image/*,application/pdf" tabIndex={-1} />
          <input className="input" name="body" value={text} onChange={(event) => setText(event.target.value)} placeholder="پیام..." aria-label="متن پیام" />
          <button className="icon-btn" type="submit" aria-label="ارسال"><Icon name="send" /></button>
        </form>
      </div>
      {manage && conversation?.type === 'group' && (
        <Sheet onClose={() => setManage(false)}>
          <div className="stack">
            <h2>اعضای گروه</h2>
            {conversation.members?.map((member) => (
              <div key={member.id} className="row between">
                <span>{member.name}</span>
                {member.id !== user?.id && (
                  <button
                    className="text-btn"
                    type="button"
                    onClick={() => void api(`/conversations/${id}/members/${member.id}`, { method: 'DELETE' }).then(load).catch((reason) => setError(errText(reason)))}
                  >
                    حذف
                  </button>
                )}
              </div>
            ))}
            <input className="input" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="افزودن از دنبال‌کننده‌ها و دنبال‌شده‌ها" />
            {memberHits.length === 0 && <p className="muted">کسی در این فهرست نیست.</p>}
            {memberHits.map((doctor) => (
              <button
                key={doctor.id}
                className="sheet-item"
                type="button"
                onClick={() => void api(`/conversations/${id}/members`, { method: 'POST', body: JSON.stringify({ user_id: doctor.id }) }).then(() => { setMemberQuery(''); load() }).catch((reason) => setError(errText(reason)))}
              >
                افزودن {doctor.name}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  )
}

type ProfilePayload = {
  posts: Post[]
  reposts: Post[]
  topics: Topic[]
  communities: CommunityCard[]
}

function ProfileTabs({ payload }: { payload: ProfilePayload; onChange?: () => void }) {
  const [tab, setTab] = useState<'posts' | 'reposts' | 'communities'>('posts')
  const navigate = useNavigate()
  return (
  <>
    <nav className="profile-segments" aria-label="بخش‌های پروفایل">
      <button className={tab === 'posts' ? 'segment is-on' : 'segment'} type="button" onClick={() => setTab('posts')}><Icon name="home" /> پست</button>
      <button className={tab === 'reposts' ? 'segment is-on' : 'segment'} type="button" onClick={() => setTab('reposts')}><Icon name="repost" /> ریپست</button>
      <button className={tab === 'communities' ? 'segment is-on' : 'segment'} type="button" onClick={() => setTab('communities')}><Icon name="users" /> انجمن</button>
    </nav>
    <div className="profile-tab-panel">
      {tab === 'posts' && (
        <>
          {payload.posts.length === 0 && <Empty title="پستی نیست" text="اولین پست را از دکمه انتشار بسازید." />}
          <PostGrid posts={payload.posts} aspect="portrait" />
        </>
      )}
      {tab === 'reposts' && (
        <>
          {payload.reposts.length === 0 && <Empty title="ریپوستی نیست" text="بازنشرهای شما اینجا نمایش داده می‌شود." />}
          <PostGrid posts={payload.reposts} aspect="portrait" />
        </>
      )}
      {tab === 'communities' && (
        <div className="pad">
          {payload.communities.length === 0 && <Empty title="عضو انجمن نیستید" text="از تب انجمن‌ها به تخصص‌های مورد علاقه بپیوندید." />}
          {payload.communities.map((community) => (
            <button key={community.id} className="list-row" type="button" onClick={() => navigate(`/communities/${community.slug}`)}>
              <span className="community-chip">{community.specialty.slice(0, 2)}</span>
              <div className="body">
                <div className="title">{community.name}</div>
                <div className="sub">{community.members_count} عضو · {community.topics_count} موضوع</div>
              </div>
            </button>
          ))}
          {payload.topics.length > 0 && (
            <>
              <h2 className="section-title">موضوعات</h2>
              {payload.topics.map((topic) => (
                <button key={topic.id} className="list-row" type="button" onClick={() => navigate(`/topics/${topic.id}`)}>
                  <div className="body">
                    <div className="title">{topic.title}</div>
                    <div className="sub">{topic.community.name} · {topic.reply_count} پاسخ</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  </>
  )
}

function ProfileLayout({
  user,
  actions,
  children,
}: {
  user: UserCard
  bannerPost?: Post | null
  actions: ReactNode
  children: ReactNode
}) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const subtitle = [user.specialty_title || user.role_label, user.city].filter(Boolean).join(' · ')
  return (
    <div className="profile-layout">
      <header className="profile-hero-card">
        <Avatar user={user} large />
        <div className="profile-name-row">
          <h1>{user.name}</h1>
          <VerifiedSeal user={user} />
        </div>
        {subtitle && <p className="profile-sub">{subtitle}</p>}
        {user.specialty_title && (
          <span className="chip chip-blue profile-spec-chip">تخصص {user.badges.specialty ? 'تأییدشده' : 'خوداظهاری'}</span>
        )}
        <div className="stats stats--inline">
          <div><b>{user.posts_count}</b><span>پست</span></div>
          <div><b>{user.followers_count}</b><span>دنبال‌کننده</span></div>
          <div><b>{user.following_count}</b><span>دنبال‌شده</span></div>
        </div>
        <div className="profile-actions">{actions}</div>
        <button className="profile-about-toggle" type="button" onClick={() => setAboutOpen((v) => !v)}>
          {aboutOpen ? 'بستن درباره' : 'درباره و سوابق'}
        </button>
        {aboutOpen && (
          <div className="profile-about">
            <AboutSection user={user} />
            <p className="muted profile-disclaimer">نشان آبی فقط تأیید هویت فردی است. اعتبار علمی جدا نمایش داده می‌شود.</p>
          </div>
        )}
      </header>
      {children}
    </div>
  )
}

export function Profile() {
  const { user, refresh } = useAuth()
  const [payload, setPayload] = useState<ProfilePayload>({ posts: [], reposts: [], topics: [], communities: [] })
  const load = () => {
    if (!user?.slug) return
    void api<ProfilePayload & { data: UserCard }>(`/doctors/${user.slug}`).then((body) => {
      setPayload({
        posts: body.posts,
        reposts: body.reposts,
        topics: body.topics,
        communities: body.communities,
      })
    }).catch(() => undefined)
  }
  useEffect(load, [user?.slug])
  if (!user) return null
  return (
    <>
      <Top title="پروفایل" />
      <div className="screen-body profile-screen">
        <ProfileLayout
          user={user}
          actions={(
            <>
              <Link className="btn btn-ghost" to="/profile/edit"><Icon name="edit" /> ویرایش</Link>
              <Link className="btn btn-primary" to="/settings"><Icon name="settings" /> تنظیمات</Link>
            </>
          )}
        >
          <ProfileTabs payload={payload} onChange={() => { load(); void refresh() }} />
        </ProfileLayout>
      </div>
    </>
  )
}

export function DoctorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserCard | null>(null)
  const [payload, setPayload] = useState<ProfilePayload>({ posts: [], reposts: [], topics: [], communities: [] })
  const [error, setError] = useState('')

  const load = () => {
    api<ProfilePayload & { data: UserCard }>(`/doctors/${slug}`)
      .then((body) => {
        setUser(body.data)
        setPayload({
          posts: body.posts,
          reposts: body.reposts,
          topics: body.topics,
          communities: body.communities,
        })
      })
      .catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [slug])

  return (
    <>
      <Top title="پروفایل" back />
      <div className="screen-body profile-screen">
        {error && <div className="error pad">{error}</div>}
        {user && (
          <ProfileLayout
            user={user}
            actions={!user.is_self ? (
              <>
                <button className="btn btn-primary" type="button" onClick={() => void api(`/doctors/${user.id}/follow`, { method: user.is_following ? 'DELETE' : 'POST' }).then(load)}>
                  {user.is_following ? 'دنبال می‌کنید' : 'دنبال کردن'}
                </button>
                {user.id && (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => void api<{ data: Conversation }>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: user.id }) }).then((row) => navigate(`/messages/${row.data.id}`)).catch((reason) => setError(errText(reason)))}
                  >
                    <Icon name="chat" /> پیام
                  </button>
                )}
              </>
            ) : <span />}
          >
            <ProfileTabs payload={payload} onChange={load} />
          </ProfileLayout>
        )}
      </div>
    </>
  )
}

function AboutSection({ user }: { user: UserCard | Me }) {
  const grouped = groupEntries(user.entries || [])
  return (
    <>
      <div className="about-card">
        {user.bio && <p style={{ lineHeight: 1.75, marginBottom: 12 }}>{user.bio}</p>}
        {Object.entries(grouped).map(([kind, rows]) => (
          <div key={kind} className="kv">
            <span className="k">{entryLabels[kind] || kind}</span>
            <span>{rows.map((row) => [row.title, row.subtitle, row.year].filter(Boolean).join(' · ')).join('؛ ')}</span>
          </div>
        ))}
        {!user.bio && Object.keys(grouped).length === 0 && <p className="muted">بیوگرافی هنوز تکمیل نشده است.</p>}
      </div>
    </>
  )
}

function groupEntries(entries: Entry[]): Record<string, Entry[]> {
  return entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    acc[entry.kind] = [...(acc[entry.kind] || []), entry]
    return acc
  }, {})
}

export function EditProfile() {
  const { user, refresh } = useAuth()
  const [error, setError] = useState('')
  if (!user) return null
  return (
    <>
      <Top title="ویرایش پروفایل" back />
      <div className="screen-body pad">
        {error && <div className="error">{error}</div>}
        <div className="center profile-edit-hero">
          <Avatar user={user} large />
          <form
            className="avatar-upload"
            onSubmit={(event) => {
              event.preventDefault()
              const body = new FormData(event.currentTarget)
              void api('/me/avatar', { method: 'POST', body }).then(() => refresh()).catch((reason) => setError(errText(reason)))
            }}
          >
            <label className="btn btn-ghost">
              <Icon name="camera" /> تغییر عکس
              <input className="sr-only" name="avatar" type="file" accept="image/*" required onChange={(event) => {
                if (event.target.files?.length) event.currentTarget.form?.requestSubmit()
              }} />
            </label>
          </form>
        </div>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const payload = Object.fromEntries(form.entries())
            void api('/me', { method: 'PATCH', body: JSON.stringify(payload) }).then(() => refresh()).catch((reason) => setError(errText(reason)))
          }}
        >
          <div className="field"><label htmlFor="en">نام نمایشی</label><input className="input" id="en" name="name" defaultValue={user.name} /></div>
          <div className="field"><label htmlFor="eb">بیوگرافی حرفه‌ای</label><textarea className="textarea" id="eb" name="bio" defaultValue={user.bio || ''} style={{ minHeight: 90 }} /></div>
          <div className="field"><label htmlFor="ew">عنوان / محل کار</label><input className="input" id="ew" name="headline" defaultValue={user.headline || ''} /></div>
          <div className="field"><label htmlFor="ec">شهر</label><input className="input" id="ec" name="city" defaultValue={user.city || ''} /></div>
          <div className="field"><label htmlFor="es">تخصص</label><input className="input" id="es" name="specialty_title" defaultValue={user.specialty_title || ''} /></div>
          <div className="banner banner-info">شماره نظام و مدارک حساس در اطلاعات عمومی پروفایل نمایش داده نمی‌شوند.</div>
          <button className="btn btn-primary btn-block" type="submit">ذخیره</button>
        </form>
        <form
          className="stack"
          style={{ marginTop: 20 }}
          onSubmit={(event) => {
            event.preventDefault()
            const form = Object.fromEntries(new FormData(event.currentTarget).entries())
            void api('/me/entries', { method: 'POST', body: JSON.stringify(form) }).then(() => refresh()).catch((reason) => setError(errText(reason)))
          }}
        >
          <h2 className="section-title" style={{ padding: 0 }}>سابقه و دستاورد</h2>
          <select className="select" name="kind" defaultValue="experience">
            <option value="education">تحصیل</option>
            <option value="experience">شغل</option>
            <option value="publication">مقاله</option>
            <option value="certificate">دوره</option>
            <option value="talk">سخنرانی</option>
            <option value="skill">مهارت</option>
          </select>
          <input className="input" name="title" placeholder="عنوان" required />
          <input className="input" name="subtitle" placeholder="محل یا ناشر" />
          <input className="input" name="year" placeholder="سال" />
          <button className="btn btn-ghost btn-block" type="submit">افزودن</button>
        </form>
      </div>
    </>
  )
}

const exploreKey = 'tebyar-explore'

export function Explore() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [doctors, setDoctors] = useState<UserCard[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [posts, setPosts] = useState<Post[]>(() => readCache<Post[]>(exploreKey) ?? [])
  const [loading, setLoading] = useState(() => readCache<Post[]>(exploreKey) == null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [commentId, setCommentId] = useState<number | null>(null)

  useEffect(() => {
  if (q.trim().length >= 2) {
      setLoading(true)
      const timer = window.setTimeout(() => {
        void api<{ doctors: UserCard[]; posts: Post[]; hashtags?: string[] }>(`/explore?q=${encodeURIComponent(q)}`).then((payload) => {
          setDoctors(payload.doctors)
          setTags(payload.hashtags ?? [])
          setPosts(payload.posts)
          setLoading(false)
        }).catch(() => setLoading(false))
      }, 250)
      return () => window.clearTimeout(timer)
    }
    const cached = readCache<Post[]>(exploreKey)
    if (cached) {
      setPosts(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setDoctors([])
    setTags([])
    void api<{ data: Post[] }>('/explore').then((payload) => {
      setPosts(payload.data)
      writeCache(exploreKey, payload.data)
      setLoading(false)
    }).catch(() => setLoading(false))
    return undefined
  }, [q])

  return (
    <>
      <Top title="اکسپلور" back />
      <div className="screen-body pad search-screen">
        <div className="field">
          <input className="input" value={q} onChange={(event) => setQ(event.target.value)} placeholder="نام، پست یا هشتگ" />
        </div>
        {tags.length > 0 && (
          <div className="chips explore-tags">
            {tags.map((tag) => (
              <button key={tag} className="chip chip-blue" type="button" onClick={() => setQ(`#${tag}`)}>#{tag}</button>
            ))}
          </div>
        )}
        {loading && posts.length === 0 && doctors.length === 0 && <p className="muted pad">در حال بارگذاری...</p>}
        {doctors.map((doctor) => (
          <button key={doctor.id} className="list-row" type="button" onClick={() => doctor.slug && navigate(`/doctors/${doctor.slug}`)}>
            <Avatar user={doctor} />
            <div className="body">
              <div className="title">{doctor.name}</div>
              <div className="sub">{doctor.specialty_title || doctor.role_label} · {doctor.city}</div>
            </div>
          </button>
        ))}
        {!loading && q.trim().length < 2 && posts.length === 0 && <Empty title="پستی نیست" text="اولین پست‌ها به‌زودی اینجا ظاهر می‌شوند." />}
        {q.trim().length >= 2
          ? posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onComment={() => setCommentId(post.id)}
              onChange={() => undefined}
            />
          ))
          : (
            <PostGrid
              posts={posts}
              aspect="portrait"
              onOpen={(_, index) => setViewerIndex(index)}
            />
          )}
      </div>
      {viewerIndex != null && posts.length > 0 && (
        <PostViewer posts={posts} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
      <CommentSheet postId={commentId} open={commentId != null} onClose={() => setCommentId(null)} />
    </>
  )
}