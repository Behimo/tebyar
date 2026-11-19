import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Me, Notice, UserCard, Vacancy } from '../types'
import { Empty, Person, Top, Toggle, errText } from '../ui'
import { Brand } from '../icons'

const roles = [
  ['student', 'دانشجو'],
  ['intern', 'اینترن'],
  ['resident', 'رزیدنت'],
  ['general', 'پزشک عمومی'],
  ['specialist', 'متخصص'],
  ['employer', 'مرکز درمانی'],
] as const

export function Login() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <>
      <header className="topbar"><span /><Brand /><span /></header>
      <div className="screen-body pad">
      <div className="auth-hero">
        <h1>ورود پزشکان</h1>
        <p className="lead">طبیار شبکهٔ پزشکان، رزیدنت‌ها و دانشجویان پزشکی است. پزشکان با شماره نظام پزشکی تأیید می‌شوند.</p>
      </div>
      <div className="banner banner-warn">در حالت آزمایشی پیامک واقعی ارسال نمی‌شود و کد روی صفحهٔ بعد نشان داده می‌شود.</div>
      <form onSubmit={(event) => {
        event.preventDefault()
        setBusy(true)
        void api<{ debug_code?: string }>('/auth/otp', { method: 'POST', body: JSON.stringify({ phone }) })
          .then((payload) => {
            sessionStorage.setItem('tebyar_phone', phone)
            if (payload.debug_code) sessionStorage.setItem('tebyar_debug_code', payload.debug_code)
            navigate('/otp')
          })
          .catch((reason) => setError(errText(reason)))
          .finally(() => setBusy(false))
      }}>
        <div className="field">
          <label>شماره موبایل</label>
          <input className="input ltr" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09120000000" required />
        </div>
        {error && <p className="field-error" style={{ display: 'block' }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy} type="submit">دریافت کد</button>
      </form>
      <p className="center muted" style={{ marginTop: 16, fontSize: 13 }}>مرکز درمانی هستید؟ بعد از دریافت کد، نقش کارفرما را انتخاب کنید.</p>
      </div>
    </>
  )
}

export function Otp() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const phone = sessionStorage.getItem('tebyar_phone') || ''
  const debug = sessionStorage.getItem('tebyar_debug_code')
  const [code, setCode] = useState(debug || '')
  const [error, setError] = useState('')

  return (
    <>
      <Top title="کد تأیید" back />
      <form className="screen-body pad stack" onSubmit={(event) => {
        event.preventDefault()
        void api<{ token: string; user: Me }>('/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) })
          .then((payload) => {
            setSession(payload.token, payload.user)
            const status = payload.user.account_status
            if (status === 'verified' && payload.user.role === 'employer') navigate('/employer')
            else if (status === 'verified') navigate('/')
            else if (!payload.user.role) navigate('/join')
            else navigate('/pending')
          })
          .catch((reason) => setError(errText(reason)))
      }}>
        <p className="lead">کد پنج‌رقمی به {phone} ارسال شد.</p>
        {debug && <div className="banner banner-info">حالت آزمایشی: کد {debug}</div>}
        <div className="field">
          <label htmlFor="otp-code">کد تأیید</label>
          <input id="otp-code" className="input ltr" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="12345" required />
        </div>
        {error && <p className="field-error" style={{ display: 'block' }}>{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">ورود</button>
      </form>
    </>
  )
}

export function Join() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<(typeof roles)[number][0]>(sessionStorage.getItem('tebyar_intent') === 'employer' ? 'employer' : 'general')
  const [error, setError] = useState('')
  const learner = role === 'student' || role === 'intern'
  const licensed = role === 'resident' || role === 'general' || role === 'specialist'

  return (
    <>
      <Top title="احراز هویت" />
      <form className="screen-body pad stack" onSubmit={(event) => {
        event.preventDefault()
        const body = new FormData(event.currentTarget)
        body.set('role', role)
        void api('/me/onboarding', { method: 'POST', body })
          .then(() => refresh())
          .then(() => navigate('/pending'))
          .catch((reason) => setError(errText(reason)))
      }}>
        <p className="lead">برای دانشجو و اینترن فقط شماره دانشجویی لازم است. برای رزیدنت و پزشک فقط شماره نظام پزشکی. ادمین هویت را بررسی می‌کند.</p>
        <div className="role-grid">
          {roles.map(([value, label]) => (
            <button key={value} type="button" className={role === value ? 'on' : ''} onClick={() => setRole(value)}>{label}</button>
          ))}
        </div>
        <input className="input" name="name" defaultValue={user?.name || ''} placeholder="نام و نام خانوادگی" required />
        {learner && (
          <div className="field">
            <label>شماره دانشجویی</label>
            <input className="input ltr" name="student_number" inputMode="numeric" placeholder="مثلاً ۴۰۱۲۳۴۵۶۷" required />
          </div>
        )}
        {licensed && (
          <div className="field">
            <label>شماره نظام پزشکی</label>
            <input className="input ltr" name="medical_council_number" inputMode="numeric" placeholder="مثلاً ۱۲۳۴۵" required />
          </div>
        )}
        {role === 'employer' && (
          <>
            <input className="input" name="city" placeholder="شهر" required />
            <input className="input" name="organization_name" placeholder="نام مرکز" required />
            <select className="select" name="organization_type" defaultValue="hospital">
              <option value="hospital">بیمارستان</option>
              <option value="clinic">کلینیک</option>
              <option value="teaching">مرکز آموزشی</option>
            </select>
            <textarea className="textarea" name="about" placeholder="معرفی کوتاه مرکز" />
            <label className="label">مدرک مرکز<input className="input" name="document" type="file" accept="image/*,application/pdf" required /></label>
          </>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit">ارسال برای بررسی</button>
      </form>
    </>
  )
}

export function Pending() {
  const { user, refresh, logout } = useAuth()
  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 8000)
    return () => window.clearInterval(timer)
  }, [refresh])
  return (
    <>
      <Top title="وضعیت حساب" />
      <div className="screen-body pad stack auth-wait">
      <div className="card stack">
        <b>{user?.status_label}</b>
        <p className="lead">{user?.verification?.note || 'مدارک شما در صف بررسی ادمین است. تا تأیید، فید جامعه باز نمی‌شود.'}</p>
      </div>
      {(user?.account_status === 'needs_correction' || !user?.role) && <Link className="btn btn-primary btn-block" to="/join">اصلاح اطلاعات</Link>}
      <button className="btn btn-ghost btn-block" type="button" onClick={() => void logout()}>خروج</button>
    </div>
    </>
  )
}

export function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notice[]>([])
  useEffect(() => {
    api<{ data: Notice[] }>('/notifications').then((payload) => setItems(payload.data)).catch(() => undefined)
    void api('/notifications/read', { method: 'POST' })
  }, [])
  return (
    <>
      <Top title="اعلان‌ها" back />
      <div className="screen-body pad">
        {items.length === 0 && <Empty title="اعلانی نیست" text="تعامل‌ها، پیام‌ها و نتیجه احراز اینجا می‌آیند." />}
        {items.map((item) => (
          <button key={item.id} className="list-row" type="button" onClick={() => item.href && navigate(item.href)}>
            <span className="avatar sm" style={{ display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{item.title.trim().charAt(0)}</span>
            <div className="body">
              <div className="title">{item.title}</div>
              <div className="sub">{item.body}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

export function Settings() {
  const { user, refresh, logout } = useAuth()
  const [blocks, setBlocks] = useState<UserCard[]>([])
  const [tickets, setTickets] = useState<{ id: number; subject: string; status: string; messages: { body: string }[] }[]>([])
  const [message, setMessage] = useState('')
  const [supportOpen, setSupportOpen] = useState(false)
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark')
  const [notifyInteractions, setNotifyInteractions] = useState(user?.notify_interactions ?? true)
  const [notifyMessages, setNotifyMessages] = useState(user?.notify_messages ?? true)
  const [privacyDm, setPrivacyDm] = useState(user?.privacy_dm ?? 'everyone')

  const savePrivacy = (patch: Record<string, unknown>) => {
    void api('/me', { method: 'PATCH', body: JSON.stringify(patch) }).then(() => refresh())
  }

  useEffect(() => {
    if (!user) return
    setNotifyInteractions(user.notify_interactions)
    setNotifyMessages(user.notify_messages)
    setPrivacyDm(user.privacy_dm)
  }, [user])

  useEffect(() => {
    api<{ data: UserCard[] }>('/blocks').then((payload) => setBlocks(payload.data)).catch(() => undefined)
    api<{ data: { id: number; subject: string; status: string; messages: { body: string }[] }[] }>('/support-tickets')
      .then((payload) => setTickets(payload.data))
      .catch(() => undefined)
  }, [])

  if (!user) return null
  return (
    <>
      <Top title="تنظیمات" back />
      <div className="screen-body pad settings-screen">
        <h2 className="section-title section-title--tight">ظاهر</h2>
        <div className="card pad-in settings-card">
          <div className="kv">
            <span className="k">حالت تیره / روشن</span>
            <Toggle
              label="تغییر تم"
              on={dark}
              onChange={(next) => {
                setDark(next)
                document.documentElement.dataset.theme = next ? 'dark' : 'light'
                localStorage.setItem('tebyar_theme', next ? 'dark' : '')
              }}
            />
          </div>
        </div>

        <h2 className="section-title section-title--tight">حریم خصوصی</h2>
        <div className="card pad-in settings-card">
          <div className="kv kv-stack">
            <span className="k">چه کسی می‌تواند پیام بدهد</span>
            <select
              className="select"
              value={privacyDm}
              onChange={(event) => {
                const value = event.target.value
                setPrivacyDm(value)
                savePrivacy({ privacy_dm: value })
              }}
            >
              <option value="everyone">همه اعضای تأییدشده</option>
              <option value="following">فقط دنبال‌شوندگان</option>
              <option value="none">هیچ‌کس</option>
            </select>
          </div>
          <div className="kv">
            <span className="k">اعلان تعامل‌ها</span>
            <Toggle label="اعلان تعامل‌ها" on={notifyInteractions} onChange={(next) => { setNotifyInteractions(next); savePrivacy({ notify_interactions: next }) }} />
          </div>
          <div className="kv">
            <span className="k">اعلان پیام‌ها</span>
            <Toggle label="اعلان پیام‌ها" on={notifyMessages} onChange={(next) => { setNotifyMessages(next); savePrivacy({ notify_messages: next }) }} />
          </div>
        </div>

        <h2 className="section-title section-title--tight">حساب</h2>
        <div className="card pad-in settings-card settings-account">
          <Link className="list-row" to="/pending">
            <div className="body"><div className="title">وضعیت احراز هویت</div><div className="sub">{user.status_label}</div></div>
          </Link>
          {blocks.length > 0 && (
            <div className="settings-blocks">
              <p className="muted" style={{ fontSize: 12, margin: '8px 0' }}>مسدودشده‌ها</p>
              {blocks.map((person) => person.id && (
                <div key={person.id} className="row between">
                  <Person user={person} />
                  <button className="text-btn" type="button" onClick={() => void api(`/blocks/${person.id}`, { method: 'DELETE' }).then(() => setBlocks((list) => list.filter((item) => item.id !== person.id)))}>رفع</button>
                </div>
              ))}
            </div>
          )}
          <button className="list-row" type="button" onClick={() => setSupportOpen((value) => !value)}>
            <div className="body"><div className="title">پشتیبانی</div><div className="sub">تیکت به تیم طبیار</div></div>
          </button>
          {supportOpen && (
            <form className="stack" style={{ paddingTop: 8 }} onSubmit={(event) => {
              event.preventDefault()
              const form = Object.fromEntries(new FormData(event.currentTarget).entries())
              void api('/support-tickets', { method: 'POST', body: JSON.stringify(form) }).then(() => setMessage('درخواست پشتیبانی ثبت شد.'))
            }}>
              <input className="input" name="subject" placeholder="موضوع" required />
              <textarea className="textarea" name="body" placeholder="شرح" required />
              <button className="btn btn-ghost btn-block" type="submit">ارسال</button>
              {message && <div className="banner banner-success">{message}</div>}
            </form>
          )}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="muted" style={{ fontSize: 12, padding: '6px 0' }}>
              <b>{ticket.subject}</b> — {ticket.status}
            </div>
          ))}
          <button className="list-row" type="button" onClick={() => void logout()}>
            <div className="body"><div className="title">خروج</div><div className="sub">پایان نشست فعلی</div></div>
          </button>
        </div>
      </div>
    </>
  )
}

export function Jobs() {
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')
  const [employment, setEmployment] = useState('')
  const [items, setItems] = useState<Vacancy[]>([])
  const load = () => {
    const query = new URLSearchParams({ specialty, city, employment_type: employment })
    void api<{ data: Vacancy[] }>(`/jobs?${query}`).then((payload) => setItems(payload.data))
  }
  useEffect(load, [specialty, city, employment])
  return (
    <>
      <Top title="فرصت‌های شغلی" back />
      <div className="screen-body pad stack">
        <input className="field" value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="تخصص" />
        <input className="field" value={city} onChange={(event) => setCity(event.target.value)} placeholder="شهر" />
        <select className="select" value={employment} onChange={(event) => setEmployment(event.target.value)}>
          <option value="">همه نوع همکاری</option>
          <option value="full_time">تمام‌وقت</option>
          <option value="part_time">پاره‌وقت</option>
          <option value="teaching">تدریس</option>
          <option value="collaboration">همکاری حرفه‌ای</option>
        </select>
        {items.length === 0 && <Empty title="آگهی‌ای نیست" text="فیلتر را تغییر دهید." />}
        {items.map((item) => (
          <Link key={item.id} to={`/jobs/${item.id}`} className="card stack">
            <b>{item.title}</b>
            <span className="muted">{item.organization.name} · {item.city}</span>
            <span className="chip">{item.employment_label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function JobPage() {
  const { id } = useParams()
  const [job, setJob] = useState<Vacancy | null>(null)
  useEffect(() => {
    api<{ data: Vacancy }>(`/jobs/${id}`).then((payload) => setJob(payload.data)).catch(() => undefined)
  }, [id])
  if (!job) return <SkelWait />
  return (
    <>
      <Top title="جزئیات آگهی" back />
      <div className="screen-body pad stack">
        <div className="banner calm">آگهی‌های نمونه استخدام واقعی نیستند.</div>
        <h2>{job.title}</h2>
        <p className="muted">{job.organization.name} · {job.organization.type_label} · {job.city}</p>
        <span className="chip">{job.specialty}</span>
        <span className="chip chip-blue">{job.employment_label}</span>
        <p style={{ lineHeight: 1.8 }}>{job.description}</p>
        <p className="muted">{job.organization.about}</p>
        <div className="row">
          <button className="btn" type="button" onClick={() => void api(`/jobs/${job.id}/save`, { method: job.saved ? 'DELETE' : 'POST' }).then(() => setJob({ ...job, saved: !job.saved }))}>{job.saved ? 'ذخیره شده' : 'ذخیره آگهی'}</button>
          <Link className="btn primary" to={`/jobs/${job.id}/apply`}>{job.applied ? 'ویرایش درخواست' : 'ارسال درخواست'}</Link>
        </div>
      </div>
    </>
  )
}

function SkelWait() {
  return <div className="screen-body"><Top title="" back /></div>
}

export function Apply() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  return (
    <>
      <Top title="درخواست همکاری" back />
      <form className="screen-body pad stack" onSubmit={(event) => {
        event.preventDefault()
        const body = new FormData(event.currentTarget)
        void api(`/jobs/${id}/apply`, { method: 'POST', body })
          .then(() => navigate(`/jobs/${id}`))
          .catch((reason) => setError(errText(reason)))
      }}>
        <textarea className="area" name="cover_letter" placeholder="معرفی کوتاه. رزومه واقعی نفرستید اگر آگهی نمونه است." />
        <label className="lbl">رزومه<input className="field" name="resume" type="file" accept="application/pdf,image/*" /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary full" type="submit">ارسال</button>
      </form>
    </>
  )
}

export function Employer() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Vacancy[]>([])
  const [apps, setApps] = useState<{ id: number; status: string; applicant: UserCard; cover_letter: string | null }[]>([])
  const [error, setError] = useState('')
  const ready = user?.account_status === 'verified' && user.organization?.status === 'verified'

  const load = () => {
    if (!ready) return
    void api<{ data: Vacancy[] }>('/employer/jobs').then(async (payload) => {
      setJobs(payload.data)
      const first = payload.data[0]
      if (first) {
        const list = await api<{ data: { id: number; status: string; applicant: UserCard; cover_letter: string | null }[] }>(`/employer/jobs/${first.id}/applications`)
        setApps(list.data)
      }
    }).catch((reason) => setError(errText(reason)))
  }
  useEffect(load, [ready])

  return (
    <>
      <Top title="پنل کارفرما" action={<button className="text-btn" type="button" onClick={() => { localStorage.removeItem('tebyar_token'); location.href = '/login' }}>خروج</button>} />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {!ready && <div className="banner">سازمان هنوز تأیید نشده است. پس از بررسی ادمین می‌توانید آگهی منتشر کنید.</div>}
        {ready && (
          <form className="card stack" onSubmit={(event) => {
            event.preventDefault()
            const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
            void api('/employer/jobs', { method: 'POST', body: JSON.stringify(payload) }).then(load).catch((reason) => setError(errText(reason)))
          }}>
            <b>آگهی جدید</b>
            <input className="field" name="title" placeholder="عنوان" required />
            <input className="field" name="specialty" placeholder="تخصص" required />
            <input className="field" name="city" placeholder="شهر" required />
            <select className="select" name="employment_type" defaultValue="full_time">
              <option value="full_time">تمام‌وقت</option>
              <option value="part_time">پاره‌وقت</option>
              <option value="teaching">تدریس</option>
              <option value="collaboration">همکاری</option>
            </select>
            <textarea className="area" name="description" placeholder="شرح آگهی" required />
            <button className="btn primary" type="submit">انتشار آگهی</button>
          </form>
        )}
        {jobs.map((job) => <div key={job.id} className="card"><b>{job.title}</b><div className="muted">{job.applications_count || 0} درخواست</div></div>)}
        {apps.map((item) => (
          <div key={item.id} className="card stack">
            <Person user={item.applicant} />
            <span className="chip">{item.applicant.role_label}</span>
            <p>{item.cover_letter}</p>
            <div className="row">
              {(['reviewing', 'accepted', 'rejected'] as const).map((status) => (
                <button key={status} className="btn" type="button" onClick={() => void api(`/employer/applications/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }).then(load)}>{status === 'reviewing' ? 'بررسی' : status === 'accepted' ? 'پذیرش' : 'رد'}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
