import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, when } from '../api'
import { useAuth } from '../auth'
import type { ChatMessage, Conversation, Entry, Post, UserCard } from '../types'
import { Avatar, Badges, Empty, Person, PostCard, Top, errText } from '../ui'

export function Messages() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Conversation[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    api<{ data: Conversation[] }>('/conversations').then((payload) => setItems(payload.data)).catch((reason) => setError(errText(reason)))
  }, [])
  return (
    <>
      <Top title="پیام‌ها" />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {items.length === 0 && <Empty title="گفتگویی نیست" text="از صفحه یک پزشک می‌توانید گفتگو را شروع کنید." />}
        {items.map((item) => (
          <button key={item.id} className="card stack" type="button" onClick={() => navigate(`/messages/${item.id}`)} style={{ textAlign: 'right' }}>
            <div className="row between">
              <Person user={item.peer} />
              <span className="muted">{item.unread ? 'جدید' : item.last_message?.body}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

export function Chat() {
  const { id } = useParams()
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
      <div className="screen-body">
        <div className="bubble-col">
          {error && <div className="error">{error}</div>}
          {messages.map((message) => (
            <div key={message.id} className={message.mine ? 'bubble mine rise' : 'bubble rise'}>
              <div>{message.body}</div>
              {message.attachment_url && <a href={message.attachment_url}>{message.attachment_name || 'پیوست'}</a>}
              <div className="faint">{when(message.created_at)} {message.mine && message.read ? '· خوانده شد' : ''}</div>
            </div>
          ))}
        </div>
      </div>
      <form className="composer" onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        if (text) form.set('body', text)
        void api(`/conversations/${id}/messages`, { method: 'POST', body: form }).then(() => { setText(''); load() }).catch((reason) => setError(errText(reason)))
      }}>
        <input className="field" name="body" value={text} onChange={(event) => setText(event.target.value)} placeholder="پیام" />
        <input name="attachment" type="file" />
        <button className="btn primary" type="submit">ارسال</button>
      </form>
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
      <Top title="پروفایل" action={<Link className="text-btn" to="/settings">تنظیمات</Link>} />
      <div className="screen-body pad stack">
        <ProfileHero user={user} />
        <Link className="btn" to="/profile/edit">ویرایش پروفایل</Link>
        {user.entries?.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
        {posts.map((post) => <PostCard key={post.id} post={post} onChange={() => void refresh()} />)}
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
      <Top title="پزشک" back />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {user && (
          <>
            <ProfileHero user={user} />
            <div className="row">
              {!user.is_self && (
                <button className="btn primary" type="button" onClick={() => void api(`/doctors/${user.id}/follow`, { method: user.is_following ? 'DELETE' : 'POST' }).then(load)}>
                  {user.is_following ? 'دنبال می‌کنید' : 'دنبال کردن'}
                </button>
              )}
              {!user.is_self && user.id && (
                <button className="btn" type="button" onClick={() => void api<{ data: Conversation }>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: user.id }) }).then((payload) => navigate(`/messages/${payload.data.id}`)).catch((reason) => setError(errText(reason)))}>
                  پیام
                </button>
              )}
            </div>
            {user.entries?.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
          </>
        )}
        {posts.map((post) => <PostCard key={post.id} post={post} onChange={load} />)}
      </div>
    </>
  )
}

function ProfileHero({ user }: { user: UserCard }) {
  return (
    <section className="card stack">
      <div className="row">
        <Avatar user={user} large />
        <div className="stack">
          <h2>{user.name}</h2>
          <span className="muted">{user.headline || user.specialty_title}</span>
          <span className="faint">{user.city} · {user.role_label}</span>
        </div>
      </div>
      <Badges user={user} />
      {user.bio && <p style={{ lineHeight: 1.8 }}>{user.bio}</p>}
      <div className="row">
        <span><b>{user.followers_count}</b> دنبال‌کننده</span>
        <span><b>{user.following_count}</b> دنبال‌شده</span>
        <span><b>{user.posts_count}</b> پست</span>
      </div>
    </section>
  )
}

function EntryCard({ entry }: { entry: Entry }) {
  const labels: Record<string, string> = {
    education: 'تحصیل',
    experience: 'سابقه',
    publication: 'مقاله',
    certificate: 'دوره',
    talk: 'سخنرانی',
    skill: 'مهارت',
  }
  return (
    <div className="card">
      <span className="chip plain">{labels[entry.kind] || entry.kind}</span>
      <b> {entry.title}</b>
      <div className="muted">{entry.subtitle} {entry.year}</div>
    </div>
  )
}

export function EditProfile() {
  const { user, refresh } = useAuth()
  const [error, setError] = useState('')
  if (!user) return null
  return (
    <>
      <Top title="ویرایش پروفایل" back />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        <form className="stack" onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const payload = Object.fromEntries(form.entries())
          void api('/me', { method: 'PATCH', body: JSON.stringify(payload) }).then(() => refresh()).catch((reason) => setError(errText(reason)))
        }}>
          <input className="field" name="name" defaultValue={user.name} />
          <input className="field" name="headline" defaultValue={user.headline || ''} placeholder="عنوان حرفه‌ای" />
          <input className="field" name="city" defaultValue={user.city || ''} placeholder="شهر" />
          <input className="field" name="specialty_title" defaultValue={user.specialty_title || ''} placeholder="تخصص" />
          <textarea className="area" name="bio" defaultValue={user.bio || ''} placeholder="بیوگرافی" />
          <button className="btn primary" type="submit">ذخیره</button>
        </form>
        <form className="stack" onSubmit={(event) => {
          event.preventDefault()
          const body = new FormData(event.currentTarget)
          void api('/me/avatar', { method: 'POST', body }).then(() => refresh()).catch((reason) => setError(errText(reason)))
        }}>
          <label className="lbl">تصویر پروفایل<input className="field" name="avatar" type="file" accept="image/*" required /></label>
          <button className="btn" type="submit">بارگذاری تصویر</button>
        </form>
        <form className="stack" onSubmit={(event) => {
          event.preventDefault()
          const form = Object.fromEntries(new FormData(event.currentTarget).entries())
          void api('/me/entries', { method: 'POST', body: JSON.stringify(form) }).then(() => refresh()).catch((reason) => setError(errText(reason)))
        }}>
          <b>سابقه و دستاورد</b>
          <select className="select" name="kind" defaultValue="experience">
            <option value="education">تحصیل</option>
            <option value="experience">شغل</option>
            <option value="publication">مقاله</option>
            <option value="certificate">دوره</option>
            <option value="talk">سخنرانی</option>
            <option value="skill">مهارت</option>
          </select>
          <input className="field" name="title" placeholder="عنوان" required />
          <input className="field" name="subtitle" placeholder="محل یا ناشر" />
          <input className="field" name="year" placeholder="سال" />
          <button className="btn" type="submit">افزودن</button>
        </form>
        {user.can_create_case && (
          <form className="stack" onSubmit={(event) => {
            event.preventDefault()
            const body = new FormData(event.currentTarget)
            void api('/me/specialty', { method: 'POST', body }).then(() => refresh()).catch((reason) => setError(errText(reason)))
          }}>
            <b>درخواست نشان تخصص</b>
            <p className="muted">نشان تخصص جدا از پروانه بررسی می‌شود.</p>
            <input className="field" name="specialty_title" placeholder="عنوان تخصص" required />
            <input className="field" name="document" type="file" required />
            <button className="btn" type="submit">ارسال مدرک تخصص</button>
          </form>
        )}
      </div>
    </>
  )
}

export function Search() {
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
      <Top title="جستجو" back />
      <div className="screen-body pad stack">
        <input className="field" value={q} onChange={(event) => setQ(event.target.value)} placeholder="نام پزشک، تخصص، شهر یا هشتگ" />
        {doctors.map((doctor) => <Person key={doctor.id} user={doctor} />)}
        {posts.map((post) => <PostCard key={post.id} post={post} onChange={() => undefined} />)}
      </div>
    </>
  )
}
