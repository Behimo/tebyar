import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, when } from '../api'
import { useAuth } from '../auth'
import { Icon } from '../icons'
import type { ChatMessage, Conversation, Entry, Me, Post, UserCard } from '../types'
import { Avatar, Badges, Empty, PostCard, Top, errText } from '../ui'

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
  const [items, setItems] = useState<Conversation[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    api<{ data: Conversation[] }>('/conversations').then((payload) => setItems(payload.data)).catch((reason) => setError(errText(reason)))
  }, [])

  const filtered = query.trim()
    ? items.filter((item) => item.peer.name.includes(query.trim()) || item.last_message?.body?.includes(query.trim()))
    : items

  return (
    <>
      <Top title="پیام‌ها" />
      <div className="screen-body pad messages-list">
        <div className="field">
          <label className="sr-only" htmlFor="qm">جست‌وجوی گفتگو</label>
          <input className="input" id="qm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در پیام‌ها..." />
        </div>
        {error && <div className="error">{error}</div>}
        {filtered.length === 0 && <Empty title="پیامی نیست" text="گفتگوهای خصوصی اینجا فهرست می‌شوند." />}
        {filtered.map((item) => (
          <button key={item.id} className="list-row" type="button" onClick={() => navigate(`/messages/${item.id}`)}>
            <Avatar user={item.peer} />
            <div className="body">
              <div className="title">{item.peer.name}</div>
              <div className="sub">{item.last_message?.body || '—'}</div>
            </div>
            <span className="time">{item.last_message?.created_at ? when(item.last_message.created_at) : ''}</span>
            {item.unread && <span className="unread-dot" aria-label="خوانده‌نشده" />}
          </button>
        ))}
      </div>
    </>
  )
}

export function Chat() {
  const { id } = useParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [peer, setPeer] = useState<UserCard | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    api<{ data: ChatMessage[]; peer: UserCard }>(`/conversations/${id}/messages`)
      .then((payload) => { setMessages(payload.data); setPeer(payload.peer) })
      .catch((reason) => setError(errText(reason)))
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 3000)
    return () => window.clearInterval(timer)
  }, [id])

  return (
    <>
      <Top title={peer?.name || 'گفتگو'} back />
      <div className="screen-body chat-screen">
        <div className="thread">
          {error && <div className="error">{error}</div>}
          {messages.map((message) => (
            <div key={message.id} className={message.mine ? 'bubble me' : 'bubble them'}>
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
            void api(`/conversations/${id}/messages`, { method: 'POST', body: form })
              .then(() => {
                setText('')
                if (fileRef.current) fileRef.current.value = ''
                load()
              })
              .catch((reason) => setError(errText(reason)))
          }}
        >
          <button className="icon-btn" type="button" aria-label="پیوست" onClick={() => fileRef.current?.click()}>
            <Icon name="file" />
          </button>
          <input ref={fileRef} className="sr-only" name="attachment" type="file" accept="image/*,application/pdf" tabIndex={-1} />
          <input className="input" name="body" value={text} onChange={(event) => setText(event.target.value)} placeholder="پیام..." aria-label="متن پیام" />
          <button className="icon-btn" type="submit" aria-label="ارسال"><Icon name="send" /></button>
        </form>
      </div>
    </>
  )
}

export function Profile() {
  const { user, refresh } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => {
    if (!user?.slug) return
    api<{ posts: Post[] }>(`/doctors/${user.slug}`).then((payload) => setPosts(payload.posts)).catch(() => undefined)
  }, [user?.slug])
  if (!user) return null
  return (
    <>
      <Top title="پروفایل" />
      <div className="screen-body profile-screen">
        <ProfileHero user={user} />
        <div className="profile-actions">
          <Link className="btn btn-ghost" to="/profile/edit"><Icon name="edit" /> ویرایش</Link>
          <Link className="btn btn-primary" to="/settings"><Icon name="settings" /> تنظیمات</Link>
        </div>
        <AboutSection user={user} />
        <p className="pad muted profile-disclaimer">نشان هویت فقط تأیید هویت فردی است. اعتبار علمی و مدارک تخصصی جداگانه و بدون رتبه‌بندی نمایش داده می‌شوند.</p>
        <div className="profile-feed">
          {posts.map((post) => <PostCard key={post.id} post={post} flush onChange={() => void refresh()} />)}
        </div>
      </div>
    </>
  )
}

export function DoctorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserCard | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')

  const load = () => {
    api<{ data: UserCard; posts: Post[] }>(`/doctors/${slug}`)
      .then((payload) => { setUser(payload.data); setPosts(payload.posts) })
      .catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [slug])

  return (
    <>
      <Top title="پروفایل" back />
      <div className="screen-body profile-screen">
        {error && <div className="error pad">{error}</div>}
        {user && (
          <>
            <ProfileHero user={user} />
            {!user.is_self && (
              <div className="profile-actions">
                <button className="btn btn-primary" type="button" onClick={() => void api(`/doctors/${user.id}/follow`, { method: user.is_following ? 'DELETE' : 'POST' }).then(load)}>
                  {user.is_following ? 'دنبال می‌کنید' : 'دنبال کردن'}
                </button>
                {user.id && (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => void api<{ data: Conversation }>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: user.id }) }).then((payload) => navigate(`/messages/${payload.data.id}`)).catch((reason) => setError(errText(reason)))}
                  >
                    <Icon name="chat" /> پیام
                  </button>
                )}
              </div>
            )}
            <AboutSection user={user} />
          </>
        )}
        <div className="profile-feed">
          {posts.map((post) => <PostCard key={post.id} post={post} flush onChange={load} />)}
        </div>
      </div>
    </>
  )
}

function ProfileHero({ user }: { user: UserCard }) {
  const subtitle = [user.specialty_title || user.role_label, user.city].filter(Boolean).join(' · ')
  return (
    <>
      <div className="profile-hero">
        <Avatar user={user} large />
        <h1>{user.name}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        <div className="profile-hero-badges">
          <Badges user={user} />
          {user.specialty_title && (
            <span className="chip chip-blue">تخصص: {user.badges.specialty ? 'تأییدشده' : 'خوداظهاری'}</span>
          )}
        </div>
      </div>
      <div className="stats">
        <div><b>{user.followers_count}</b><span>دنبال‌کننده</span></div>
        <div><b>{user.following_count}</b><span>دنبال می‌کند</span></div>
        <div><b>{user.posts_count}</b><span>پست</span></div>
      </div>
      <p className="center muted stats-note">این اعداد تعاملی هستند و رتبه علمی نیستند.</p>
    </>
  )
}

function AboutSection({ user }: { user: UserCard | Me }) {
  const grouped = groupEntries(user.entries || [])
  return (
    <>
      <h2 className="section-title">درباره</h2>
      <div className="card pad-in about-card">
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

export function Search() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [doctors, setDoctors] = useState<UserCard[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => {
    if (q.trim().length < 2) return
    const timer = window.setTimeout(() => {
      void api<{ doctors: UserCard[]; posts: Post[] }>(`/search?q=${encodeURIComponent(q)}`).then((payload) => {
        setDoctors(payload.doctors)
        setPosts(payload.posts)
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [q])
  return (
    <>
      <Top title="جست‌وجوی پزشکان" back />
      <div className="screen-body pad search-screen">
        <div className="field">
          <input className="input" value={q} onChange={(event) => setQ(event.target.value)} placeholder="نام پزشک، تخصص، شهر یا هشتگ" />
        </div>
        {doctors.map((doctor) => (
          <button key={doctor.id} className="list-row" type="button" onClick={() => doctor.slug && navigate(`/doctors/${doctor.slug}`)}>
            <Avatar user={doctor} />
            <div className="body">
              <div className="title">{doctor.name}</div>
              <div className="sub">{doctor.specialty_title || doctor.role_label} · {doctor.city}</div>
            </div>
          </button>
        ))}
        {posts.map((post) => <PostCard key={post.id} post={post} onChange={() => undefined} />)}
      </div>
    </>
  )
}