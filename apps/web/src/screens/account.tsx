import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api, when } from '../api'
import { useAuth } from '../auth'
import type { Me, Notice, Post, UserCard, Vacancy } from '../types'
import { Avatar, Button, ConfirmSheet, Empty, Field, OtpInput, Person, Toggle, Top, VerifiedSeal, errText, latinDigits, useToast } from '../ui'
import { PostGrid } from '../post-ui'
import { Brand, Icon } from '../icons'

const proRoleMeta = [
  { value: 'general', label: 'پزشک عمومی', desc: 'دارای شماره نظام پزشکی', icon: 'shield', codeLabel: 'شماره نظام پزشکی' },
  { value: 'specialist', label: 'پزشک متخصص', desc: 'پزشک متخصص یا فوق‌تخصص', icon: 'award', codeLabel: 'شماره نظام پزشکی' },
  { value: 'resident', label: 'دستیار تخصصی', desc: 'رزیدنت دوره تخصصی', icon: 'stethoscope', codeLabel: 'شماره نظام پزشکی' },
  { value: 'pharmacist', label: 'داروساز', desc: 'دارای شماره نظام پزشکی', icon: 'book', codeLabel: 'شماره نظام پزشکی (داروساز)' },
  { value: 'nurse', label: 'پرستار', desc: 'دارای شماره نظام پرستاری', icon: 'users', codeLabel: 'شماره نظام پرستاری' },
  { value: 'veterinarian', label: 'دامپزشک', desc: 'دارای شماره نظام دامپزشکی', icon: 'stethoscope', codeLabel: 'شماره نظام دامپزشکی' },
] as const

const openRoleMeta = [
  { value: 'student', label: 'دانشجو', desc: 'دانشجوی پزشکی یا علوم سلامت', icon: 'graduation' },
  { value: 'public', label: 'عموم مردم', desc: 'کاربر عمومی علاقه‌مند به سلامت', icon: 'user' },
] as const

const employerRoleMeta = { value: 'employer', label: 'مرکز درمانی', desc: 'بیمارستان، کلینیک یا مرکز آموزشی', icon: 'building' } as const

const roleMeta = [...proRoleMeta, ...openRoleMeta, employerRoleMeta] as const

type RoleValue = (typeof roleMeta)[number]['value']

function normalizePhone(input: string): string {
  let digits = latinDigits(input).replace(/\D/g, '')
  if (digits.startsWith('0098')) digits = digits.slice(4)
  if (digits.startsWith('98') && digits.length === 12) digits = digits.slice(2)
  if (digits.startsWith('9') && digits.length === 10) digits = `0${digits}`
  return digits
}

export function Login() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = normalizePhone(phone)
    if (!/^09\d{9}$/.test(normalized)) {
      setError('شماره موبایل معتبر ۱۱ رقمی با شروع ۰۹ وارد کنید.')
      return
    }
    setError('')
    setBusy(true)
    void api<{ debug_code?: string }>('/auth/otp', { method: 'POST', body: JSON.stringify({ phone: normalized }) })
      .then((payload) => {
        sessionStorage.setItem('tebyar_phone', normalized)
        if (payload.debug_code) sessionStorage.setItem('tebyar_debug_code', payload.debug_code)
        else sessionStorage.removeItem('tebyar_debug_code')
        navigate('/otp')
      })
      .catch((reason) => setError(errText(reason)))
      .finally(() => setBusy(false))
  }

  return (
    <div className="screen-body auth-screen">
      <motion.section
        className="auth-hero-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        <span className="auth-blob auth-blob-1" aria-hidden="true" />
        <span className="auth-blob auth-blob-2" aria-hidden="true" />
        <Brand size="lg" />
        <h1>شبکه حرفه‌ای جامعه پزشکی</h1>
        <p>فضای اختصاصی پزشکان، دستیاران و دانشجویان پزشکی برای تبادل تجربه و همفکری علمی.</p>
        <div className="auth-pillars">
          <div className="auth-pillar"><Icon name="shield" /><span>احراز نظام پزشکی</span></div>
          <div className="auth-pillar"><Icon name="book" /><span>کیس‌های ناشناس</span></div>
          <div className="auth-pillar"><Icon name="briefcase" /><span>فرصت‌های همکاری</span></div>
        </div>
      </motion.section>

      <motion.form
        className="auth-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.32, 0.72, 0, 1] }}
      >
        <Field label="شماره موبایل" htmlFor="login-phone" error={error}>
          <div className="phone-group">
            <span className="phone-prefix"><Icon name="phone" /> +98</span>
            <input
              id="login-phone"
              className="input"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                if (error) setError('')
              }}
              placeholder="09120000000"
              required
            />
          </div>
        </Field>
        <Button variant="primary" block loading={busy} type="submit">
          دریافت کد تأیید
        </Button>
      </motion.form>

      <div className="center muted" style={{ fontSize: 13 }}>
        مرکز درمانی هستید؟{' '}
        <button
          type="button"
          className="text-btn"
          style={{ fontSize: 13 }}
          onClick={() => {
            sessionStorage.setItem('tebyar_intent', 'employer')
            document.getElementById('login-phone')?.focus()
          }}
        >
          ورود به‌عنوان کارفرما
        </button>
      </div>
    </div>
  )
}

export function Otp() {
  const navigate = useNavigate()
  const toast = useToast()
  const { setSession } = useAuth()
  const phone = sessionStorage.getItem('tebyar_phone') || ''
  const [debug, setDebug] = useState(sessionStorage.getItem('tebyar_debug_code'))
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(60)

  useEffect(() => {
    if (!phone) navigate('/login', { replace: true })
  }, [phone, navigate])

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  const verify = (submittedCode: string) => {
    if (submittedCode.length < 5 || busy) return
    setBusy(true)
    setError('')
    void api<{ token: string; user: Me }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code: latinDigits(submittedCode) }),
    })
      .then((payload) => {
        setSession(payload.token, payload.user)
        const status = payload.user.account_status
        if (status === 'verified' && payload.user.role === 'employer') navigate('/employer')
        else if (status === 'verified') navigate('/')
        else if (!payload.user.role) navigate('/join')
        else navigate('/pending')
      })
      .catch((reason) => setError(errText(reason)))
      .finally(() => setBusy(false))
  }

  const resend = () => {
    if (seconds > 0) return
    setSeconds(60)
    setError('')
    void api<{ debug_code?: string }>('/auth/otp', { method: 'POST', body: JSON.stringify({ phone }) })
      .then((payload) => {
        if (payload.debug_code) {
          sessionStorage.setItem('tebyar_debug_code', payload.debug_code)
          setDebug(payload.debug_code)
        }
        toast.show('کد تأیید جدید ارسال شد', 'success')
      })
      .catch((reason) => setError(errText(reason)))
  }

  return (
    <>
      <Top title="تأیید شماره موبایل" back />
      <form
        className="screen-body auth-screen"
        onSubmit={(event) => {
          event.preventDefault()
          verify(code)
        }}
      >
        <div className="auth-card">
          <div className="center stack">
            <span className="otp-phone-pill"><Icon name="phone" /> {phone}</span>
            <p className="muted" style={{ fontSize: 13.5 }}>کد پنج‌رقمی ارسال‌شده به شماره بالا را وارد کنید.</p>
          </div>

          {debug && (
            <div className="banner banner-info" style={{ margin: 0, alignItems: 'center', justifyContent: 'space-between' }}>
              <span>حالت آزمایشی — کد ورود: <b>{debug}</b></span>
              <button type="button" className="text-btn" onClick={() => { setCode(debug); verify(debug) }}>وارد کردن</button>
            </div>
          )}

          <OtpInput
            value={code}
            hasError={Boolean(error)}
            onChange={(next) => {
              setCode(next)
              if (error) setError('')
            }}
            onComplete={(filled) => verify(filled)}
          />

          {error && <div className="error center">{error}</div>}

          <Button variant="primary" block loading={busy} disabled={code.length < 5} type="submit">
            تأیید و ورود
          </Button>

          <div className="otp-meta-row">
            <Link className="text-btn" to="/login">تغییر شماره</Link>
            {seconds > 0
              ? <span>ارسال مجدد تا {seconds} ثانیه دیگر</span>
              : <button type="button" className="text-btn" onClick={resend}>ارسال مجدد کد</button>}
          </div>
        </div>
      </form>
    </>
  )
}

export function Join() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<RoleValue>(
    sessionStorage.getItem('tebyar_intent') === 'employer' ? 'employer' : 'general',
  )
  const [name, setName] = useState(user?.name && user.name !== 'عضو طبیار' ? user.name : '')
  const [studentNumber, setStudentNumber] = useState('')
  const [medicalCouncilNumber, setMedicalCouncilNumber] = useState('')
  const [city, setCity] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('hospital')
  const [about, setAbout] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const learner = role === 'student'
  const licensed = (proRoleMeta as readonly { value: string }[]).some((r) => r.value === role)
  const openRole = role === 'student' || role === 'public'
  const activeRoleMeta = roleMeta.find((r) => r.value === role)
  const activeProMeta = proRoleMeta.find((r) => r.value === role)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const body = new FormData()
    body.set('role', role)
    body.set('name', name.trim())
    if (city.trim()) body.set('city', city.trim())
    if (learner && studentNumber.trim()) body.set('student_number', latinDigits(studentNumber.trim()))
    if (licensed) body.set('medical_council_number', latinDigits(medicalCouncilNumber.trim()))
    if (role === 'employer') {
      body.set('organization_name', orgName.trim())
      body.set('organization_type', orgType)
      if (about.trim()) body.set('about', about.trim())
      if (docFile) body.set('document', docFile)
    }

    void api('/me/onboarding', { method: 'POST', body })
      .then(() => refresh())
      .then(() => {
        if (openRole) {
          toast.show('حساب شما فعال شد. خوش آمدید!', 'success')
          navigate('/')
        } else {
          toast.show('اطلاعات شما برای بررسی ثبت شد', 'success')
          navigate('/pending')
        }
      })
      .catch((reason) => setError(errText(reason)))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <Top title="تکمیل عضویت و احراز" />
      <div className="screen-body pad stack">
        <div>
          <div className="row between" style={{ marginBottom: 4 }}>
            <span className="step-label">مرحله {step === 1 ? '۱ از ۲ — انتخاب جایگاه حرفه‌ای' : '۲ از ۲ — اطلاعات هویتی'}</span>
            {step === 2 && (
              <button type="button" className="text-btn" onClick={() => setStep(1)}>تغییر نقش</button>
            )}
          </div>
          <div className="stepper-bar">
            <span className="step-dot is-done" />
            <span className={step === 2 ? 'step-dot is-done' : 'step-dot'} />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step === 1 ? (
            <motion.div
              key="step-1"
              className="stack"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <p className="lead" style={{ marginTop: 0 }}>
                جایگاه خود را انتخاب کنید تا نوع مدرک و دسترسی مناسب شما آماده شود.
              </p>
              <b style={{ fontSize: 13 }}>کادر درمان — نیازمند کد نظام و تأیید ادمین</b>
              <div className="role-cards">
                {proRoleMeta.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={role === item.value ? 'role-card is-on' : 'role-card'}
                    onClick={() => setRole(item.value)}
                  >
                    <span className="role-card-icon"><Icon name={item.icon} /></span>
                    <b>{item.label}</b>
                    <span>{item.desc}</span>
                  </button>
                ))}
              </div>
              <b style={{ fontSize: 13 }}>فعال‌سازی فوری — دسترسی محدود (مشاهده، لایک، نظر، بازنشر و پرسش در انجمن)</b>
              <div className="role-cards">
                {openRoleMeta.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={role === item.value ? 'role-card is-on' : 'role-card'}
                    onClick={() => setRole(item.value)}
                  >
                    <span className="role-card-icon"><Icon name={item.icon} /></span>
                    <b>{item.label}</b>
                    <span>{item.desc}</span>
                  </button>
                ))}
              </div>
              <div className="role-cards">
                <button
                  type="button"
                  className={role === 'employer' ? 'role-card is-on' : 'role-card'}
                  onClick={() => setRole('employer')}
                >
                  <span className="role-card-icon"><Icon name={employerRoleMeta.icon} /></span>
                  <b>{employerRoleMeta.label}</b>
                  <span>{employerRoleMeta.desc}</span>
                </button>
              </div>
              <Button variant="primary" block type="button" onClick={() => setStep(2)} style={{ marginTop: 8 }}>
                ادامه با نقش «{activeRoleMeta?.label}»
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="step-2"
              className="auth-card"
              onSubmit={submit}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="row between">
                <span className="chip chip-blue"><Icon name={activeRoleMeta?.icon || 'user'} /> {activeRoleMeta?.label}</span>
                <span className="faint">{openRole ? 'فعال‌سازی فوری' : 'بررسی توسط تیم احراز طبیار'}</span>
              </div>

              {openRole && (
                <div className="banner banner-info" style={{ margin: 0 }}>
                  <Icon name="shield" />
                  <span>با این نوع حساب می‌توانید محتوا را ببینید، لایک، نظر و بازنشر کنید و در انجمن سؤال بپرسید. انتشار پست و کیس مخصوص کادر درمان است.</span>
                </div>
              )}

              <Field label="نام و نام خانوادگی" htmlFor="join-name">
                <input
                  id="join-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً دکتر محمد رضایی"
                  required
                />
              </Field>

              {learner && (
                <Field
                  label="شماره دانشجویی (اختیاری)"
                  htmlFor="join-student"
                  help="در صورت تمایل شماره دانشجویی خود را وارد کنید."
                >
                  <input
                    id="join-student"
                    className="input ltr"
                    inputMode="numeric"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="401234567"
                  />
                </Field>
              )}

              {licensed && (
                <Field
                  label={activeProMeta?.codeLabel || 'شماره نظام پزشکی'}
                  htmlFor="join-license"
                  help="این شماره محرمانه می‌ماند و فقط برای احراز هویت استفاده می‌شود."
                >
                  <input
                    id="join-license"
                    className="input ltr"
                    inputMode="numeric"
                    value={medicalCouncilNumber}
                    onChange={(e) => setMedicalCouncilNumber(e.target.value)}
                    placeholder="12345"
                    required
                  />
                </Field>
              )}

              {role === 'employer' && (
                <>
                  <Field label="نام مرکز درمانی" htmlFor="join-org">
                    <input id="join-org" className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="بیمارستان یا کلینیک" required />
                  </Field>
                  <div className="two">
                    <Field label="نوع مرکز" htmlFor="join-org-type">
                      <select id="join-org-type" className="select" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                        <option value="hospital">بیمارستان</option>
                        <option value="clinic">کلینیک</option>
                        <option value="teaching">مرکز آموزشی</option>
                      </select>
                    </Field>
                    <Field label="شهر" htmlFor="join-city">
                      <input id="join-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="تهران" required />
                    </Field>
                  </div>
                  <Field label="معرفی کوتاه مرکز" htmlFor="join-about">
                    <textarea id="join-about" className="textarea" style={{ minHeight: 84 }} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="حوزه فعالیت و امکانات مرکز..." />
                  </Field>
                  <Field label="مدرک مجوز مرکز" help="تصویر پروانه بهره‌برداری یا معرفی‌نامه رسمی (PDF یا تصویر)">
                    <label className={docFile ? 'file-dropzone has-file' : 'file-dropzone'}>
                      <Icon name={docFile ? 'check' : 'file'} />
                      <strong>{docFile ? docFile.name : 'انتخاب فایل مدرک'}</strong>
                      <span>{docFile ? 'فایل انتخاب شد — برای تغییر کلیک کنید' : 'فرمت‌های مجاز: JPG, PNG, PDF'}</span>
                      <input
                        hidden
                        type="file"
                        accept="image/*,application/pdf"
                        required
                        onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </Field>
                </>
              )}

              {error && <div className="error">{error}</div>}
              <Button variant="primary" block loading={busy} type="submit">
                ارسال اطلاعات برای بررسی
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export function Pending() {
  const { user, refresh, logout } = useAuth()
  const toast = useToast()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 8000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const status = user?.account_status
  const needsEdit = status === 'needs_correction' || !user?.role
  const isDanger = status === 'suspended' || status === 'revoked'
  const orbClass = isDanger
    ? 'pending-orb is-danger'
    : needsEdit
      ? 'pending-orb is-correction'
      : status === 'verified'
        ? 'pending-orb is-ok'
        : 'pending-orb is-waiting'
  const orbIcon = isDanger ? 'xCircle' : needsEdit ? 'edit' : status === 'verified' ? 'check' : 'clock'

  return (
    <>
      <Top title="وضعیت حساب" />
      <div className="screen-body pad stack-lg" style={{ paddingTop: 14 }}>
        <div className="pending-hero">
          <div className={orbClass}>
            <Icon name={orbIcon} />
          </div>
          <h2 style={{ fontSize: 19 }}>{user?.status_label || 'در انتظار بررسی'}</h2>
          <p className="muted" style={{ fontSize: 13.5, maxWidth: '34ch', lineHeight: 1.75 }}>
            {user?.verification?.note || 'مدارک و مشخصات شما در صف بررسی تیم احراز طبیار قرار دارد. به‌محض تأیید، دسترسی کامل فعال می‌شود.'}
          </p>
        </div>

        <div className="card">
          <div className="timeline">
            <div className="timeline-step is-done">
              <span className="timeline-dot"><Icon name="check" /></span>
              <div className="timeline-body">
                <b>ثبت شماره موبایل و مشخصات</b>
                <span>اطلاعات اولیه با موفقیت دریافت شد</span>
              </div>
            </div>
            <div className={`timeline-step ${needsEdit ? 'is-warn' : status === 'verified' ? 'is-done' : 'is-active'}`}>
              <span className="timeline-dot"><Icon name={needsEdit ? 'edit' : status === 'verified' ? 'check' : 'clock'} /></span>
              <div className="timeline-body">
                <b>بررسی احراز هویت</b>
                <span>{needsEdit ? 'نیازمند اصلاح اطلاعات توسط شما' : 'تأیید تطابق مدارک پزشکی یا تحصیلی'}</span>
              </div>
            </div>
            <div className={`timeline-step ${status === 'verified' ? 'is-done' : ''}`}>
              <span className="timeline-dot"><Icon name="shield" /></span>
              <div className="timeline-body">
                <b>ورود به شبکه طبیار</b>
                <span>دسترسی به فید، انجمن‌ها و پیام‌رسان</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          {needsEdit && (
            <Link className="btn btn-primary btn-block" to="/join">
              <Icon name="edit" /> اصلاح اطلاعات و ارسال مجدد
            </Link>
          )}
          <Button
            variant="ghost"
            block
            loading={checking}
            onClick={() => {
              setChecking(true)
              void refresh()
                .then(() => toast.show('وضعیت به‌روزرسانی شد', 'info'))
                .finally(() => setChecking(false))
            }}
          >
            بررسی مجدد وضعیت
          </Button>
          <Button variant="ghost" block onClick={() => void logout()}>
            خروج از حساب
          </Button>
        </div>
      </div>
    </>
  )
}

export function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ data: Notice[] }>('/notifications')
      .then((payload) => setItems(payload.data))
      .catch(() => undefined)
      .finally(() => setLoading(false))
    void api('/notifications/read', { method: 'POST' })
  }, [])

  const iconFor = (type: string) => {
    if (type === 'verification') return { icon: 'shield', cls: 'notice-icon is-ok' }
    if (type === 'pro') return { icon: 'crown', cls: 'notice-icon is-ok' }
    if (type === 'warning') return { icon: 'xCircle', cls: 'notice-icon is-warn' }
    if (type === 'message') return { icon: 'direct', cls: 'notice-icon' }
    return { icon: 'bell', cls: 'notice-icon' }
  }

  return (
    <>
      <Top title="اعلان‌ها" back />
      <div className="screen-body pad stack">
        {!loading && items.length === 0 && (
          <Empty icon="bell" title="اعلانی نیست" text="تعامل‌ها، پیام‌ها و نتیجه احراز هویت اینجا می‌آیند." />
        )}
        {items.map((item, idx) => {
          const badge = iconFor(item.type)
          return (
            <motion.button
              key={item.id}
              type="button"
              className={item.read_at ? 'notice-row' : 'notice-row is-unread'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.25) }}
              onClick={() => item.href && navigate(item.href)}
            >
              <span className={badge.cls}><Icon name={badge.icon} /></span>
              <div className="body" style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <b style={{ fontSize: 14 }}>{item.title}</b>
                  {item.created_at && <span className="faint" style={{ fontSize: 11 }}>{when(item.created_at)}</span>}
                </div>
                <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{item.body}</p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

export function Bookmarks() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    void api<{ data: Post[] }>('/bookmarks')
      .then((payload) => setPosts(payload.data))
      .catch((reason) => setError(errText(reason)))
      .finally(() => setLoading(false))
  }, [])
  return (
    <>
      <Top title="ذخیره‌شده‌ها" back />
      <div className="screen-body">
        {error && <div className="error pad">{error}</div>}
        {!loading && posts.length === 0 && (
          <Empty
            icon="bookmark"
            title="ذخیره‌ای نیست"
            text="پست‌هایی که نشانه‌گذاری می‌کنید اینجا برای مرور سریع نگه داشته می‌شوند."
            action={<Link className="btn btn-primary btn-sm" to="/explore">گشت‌وگذار در اکسپلور</Link>}
          />
        )}
        <PostGrid posts={posts} />
      </div>
    </>
  )
}

const ticketStatusLabels: Record<string, string> = {
  open: 'در انتظار پاسخ',
  pending: 'پاسخ داده‌شده',
  closed: 'بسته‌شده',
}

const faNum = new Intl.NumberFormat('fa-IR')

function SettingsRow({
  icon,
  tone = 'cobalt',
  title,
  sub,
  to,
  onClick,
  trailing,
  danger = false,
}: {
  icon: string
  tone?: 'cobalt' | 'teal' | 'violet' | 'coral' | 'amber' | 'gray' | 'danger'
  title: string
  sub?: string
  to?: string
  onClick?: () => void
  trailing?: React.ReactNode
  danger?: boolean
}) {
  const content = (
    <>
      <span className={`settings-row-icon tone-${tone}`}>
        <Icon name={icon} />
      </span>
      <div className="settings-row-body">
        <div className="settings-row-title">{title}</div>
        {sub && <div className="settings-row-sub">{sub}</div>}
      </div>
      {trailing !== undefined
        ? trailing
        : <span className="settings-row-chev"><Icon name="chevronLeft" /></span>}
    </>
  )
  const cls = danger ? 'settings-row settings-row--danger' : 'settings-row'
  if (to) return <Link className={cls} to={to}>{content}</Link>
  if (onClick) return <button className={cls} type="button" onClick={onClick}>{content}</button>
  return <div className={cls}>{content}</div>
}

export function Settings() {
  const { user, refresh, logout } = useAuth()
  const toast = useToast()
  const [blocks, setBlocks] = useState<UserCard[]>([])
  const [tickets, setTickets] = useState<{ id: number; subject: string; status: string; messages: { body: string }[] }[]>([])
  const [supportOpen, setSupportOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark')
  const [notifyInteractions, setNotifyInteractions] = useState(user?.notify_interactions ?? true)
  const [notifyMessages, setNotifyMessages] = useState(user?.notify_messages ?? true)
  const [privacyDm, setPrivacyDm] = useState(user?.privacy_dm ?? 'everyone')
  const [privacyMentions, setPrivacyMentions] = useState(user?.privacy_mentions ?? 'everyone')
  const [showReadReceipts, setShowReadReceipts] = useState(user?.show_read_receipts ?? true)
  const [openToWork, setOpenToWork] = useState(user?.open_to_work ?? false)
  const [sessions, setSessions] = useState<{ id: number; name: string; current: boolean; last_used_at: string | null; created_at: string | null }[]>([])

  const savePrivacy = (patch: Record<string, unknown>) => {
    void api('/me', { method: 'PATCH', body: JSON.stringify(patch) })
      .then(() => {
        void refresh()
        toast.show('تنظیمات ذخیره شد', 'success')
      })
      .catch((reason) => toast.show(errText(reason), 'error'))
  }

  useEffect(() => {
    if (!user) return
    setNotifyInteractions(user.notify_interactions)
    setNotifyMessages(user.notify_messages)
    setPrivacyDm(user.privacy_dm)
    setPrivacyMentions(user.privacy_mentions ?? 'everyone')
    setShowReadReceipts(user.show_read_receipts ?? true)
    setOpenToWork(user.open_to_work ?? false)
  }, [user])

  const loadTickets = () => {
    api<{ data: { id: number; subject: string; status: string; messages: { body: string }[] }[] }>('/support-tickets')
      .then((payload) => setTickets(payload.data))
      .catch(() => undefined)
  }

  useEffect(() => {
    api<{ data: UserCard[] }>('/blocks').then((payload) => setBlocks(payload.data)).catch(() => undefined)
    loadTickets()
    api<{ data: { id: number; name: string; current: boolean; last_used_at: string | null; created_at: string | null }[] }>('/me/sessions')
      .then((payload) => setSessions(payload.data))
      .catch(() => undefined)
  }, [])

  if (!user) return null
  const quotaItems = user.quotas ? Object.values(user.quotas.items) : []
  const openUpgrade = () => window.dispatchEvent(new CustomEvent('tebyar:upgrade'))

  return (
    <>
      <Top title="تنظیمات و فعالیت" back />
      <div className="screen-body pad settings-screen">
        <Link className="settings-account-card" to="/profile/edit">
          <Avatar user={user} />
          <div className="body">
            <div className="name-row">
              <b>{user.name}</b>
              <VerifiedSeal user={user} />
              {user.is_pro
                ? <span className="pro-badge"><Icon name="crown" filled /> پرو</span>
                : <span className="chip">{user.role_label}</span>}
            </div>
            <div className="sub">{user.specialty_title || user.headline || 'ویرایش پروفایل و سوابق علمی'}</div>
          </div>
          <span className="settings-row-chev"><Icon name="chevronLeft" /></span>
        </Link>

        {(user.permissions?.subscribe ?? true) && (
        <section className="settings-pro-card">
            <div className="settings-pro-head">
              <div className="settings-pro-title">
                <Icon name="crown" filled />
                <span>{user.is_pro ? 'اشتراک طبیار پرو فعال است' : 'عضویت رایگان · طبیار پرو'}</span>
              </div>
              <Button size="sm" variant={user.is_pro ? 'ghost' : 'primary'} type="button" onClick={openUpgrade}>
                {user.is_pro ? 'جزئیات اشتراک' : 'ارتقا به پرو'}
              </Button>
            </div>
            {user.is_pro ? (
              <p className="muted" style={{ fontSize: 12.5 }}>
                {user.pro_until
                  ? `انتشار نامحدود در فید و انجمن‌ها، ارسال پیام و آمار کامل تا ${when(user.pro_until)} فعال است.`
                  : 'انتشار نامحدود و آمار کامل برای حساب شما فعال است.'}
              </p>
            ) : (
              <>
                <p className="muted" style={{ fontSize: 12.5 }}>
                  {user.quotas?.is_exempt
                    ? 'حساب شما از محدودیت انتشار معاف است.'
                    : 'میزان مصرف از سهمیه پایه رایگان:'}
                </p>
                {!user.quotas?.is_exempt && quotaItems.length > 0 && (
                  <div className="quota-list">
                    {quotaItems.map((item) => {
                      const limit = item.limit ?? 0
                      const pct = limit > 0 ? Math.min(100, Math.round((item.used / limit) * 100)) : 0
                      return (
                        <div key={item.key} className="quota-row">
                          <div className="quota-row-head">
                            <span>{item.label}</span>
                            <b className={item.exceeded ? 'is-full' : ''}>
                              {limit > 0 ? `${faNum.format(item.used)} از ${faNum.format(limit)}` : faNum.format(item.used)}
                            </b>
                          </div>
                          {limit > 0 && (
                            <div className="quota-track">
                              <div className={item.exceeded ? 'quota-fill is-full' : 'quota-fill'} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {(user.permissions?.insights ?? true) && (
          <>
            <h2 className="section-title section-title--tight">ابزارهای حرفه‌ای</h2>
            <div className="card settings-card">
              <SettingsRow
                icon="insights"
                tone="violet"
                title="آمار و اینسایت"
                sub={user.is_pro ? 'بازدیدها، تعامل‌ها و ترکیب مخاطبان' : 'خلاصه ۷ روزه · آمار کامل با پرو'}
                to="/insights"
              />
              <SettingsRow
                icon="briefcase"
                tone="teal"
                title="آماده همکاری (Open to Work)"
                sub="نمایش نشان آماده همکاری در پروفایل شما"
                trailing={(
                  <Toggle
                    label="آماده همکاری"
                    on={openToWork}
                    onChange={(next) => { setOpenToWork(next); savePrivacy({ open_to_work: next }) }}
                  />
                )}
              />
            </div>
          </>
        )}

        <h2 className="section-title section-title--tight">فعالیت شما در طبیار</h2>
        <div className="card settings-card">
          <SettingsRow icon="bookmark" tone="cobalt" title="ذخیره‌شده‌ها" sub="پست‌های نشانه‌گذاری‌شده" to="/bookmarks" />
          {(user.permissions?.message ?? true) && <SettingsRow icon="direct" tone="teal" title="پیام‌ها و دایرکت" sub="گفتگوهای خصوصی و گروهی" to="/messages" />}
          <SettingsRow icon="bell" tone="amber" title="اعلان‌ها" sub="لایک‌ها، نظرها و وضعیت احراز" to="/notifications" />
          <SettingsRow icon="explore" tone="violet" title="اکسپلور" sub="جست‌وجو و کشف پست‌های برگزیده" to="/explore" />
        </div>

        <h2 className="section-title section-title--tight">حریم خصوصی و اعلان‌ها</h2>
        <div className="card settings-card">
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
          <div className="kv kv-stack">
            <span className="k">چه کسانی بتوانند منشن کنند (@)</span>
            <select
              className="select"
              value={privacyMentions}
              onChange={(event) => {
                const value = event.target.value
                setPrivacyMentions(value)
                savePrivacy({ privacy_mentions: value })
              }}
            >
              <option value="everyone">همه اعضای تأییدشده</option>
              <option value="following">فقط دنبال‌شوندگان</option>
              <option value="none">هیچ‌کس</option>
            </select>
          </div>
          <div className="kv">
            <span className="k">نمایش رسید خوانده‌شدن پیام</span>
            <Toggle
              label="نمایش رسید خوانده‌شدن پیام"
              on={showReadReceipts}
              onChange={(next) => { setShowReadReceipts(next); savePrivacy({ show_read_receipts: next }) }}
            />
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

        <h2 className="section-title section-title--tight">ظاهر و داده</h2>
        <div className="card settings-card">
          <SettingsRow
            icon="sparkles"
            tone="amber"
            title="حالت تیره"
            sub={dark ? 'پوسته شب فعال است' : 'پوسته روشن فعال است'}
            trailing={(
              <Toggle
                label="تغییر تم"
                on={dark}
                onChange={(next) => {
                  setDark(next)
                  document.documentElement.dataset.theme = next ? 'dark' : 'light'
                  localStorage.setItem('tebyar_theme', next ? 'dark' : '')
                }}
              />
            )}
          />
          <SettingsRow
            icon="trash"
            tone="gray"
            title="پاک‌کردن کش محلی"
            sub="پاک‌سازی فید، انجمن‌ها و پیام‌های کش‌شده"
            trailing={null}
            onClick={() => {
              const keys = Object.keys(sessionStorage).filter((key) => key.startsWith('tebyar-'))
              keys.forEach((key) => sessionStorage.removeItem(key))
              toast.show('حافظه موقت پاک شد', 'info')
            }}
          />
        </div>

        <h2 className="section-title section-title--tight">امنیت و حساب</h2>
        <div className="card settings-card">
          <SettingsRow icon="shield" tone="teal" title="وضعیت احراز هویت" sub={user.status_label} to="/pending" />
          {sessions.length > 0 && (
            <div style={{ padding: '10px 2px', borderBottom: '1px solid var(--line)' }}>
              <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>نشست‌های فعال</p>
              {sessions.map((session) => (
                <div key={session.id} className="row between" style={{ padding: '6px 0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {session.name}{session.current ? ' (دستگاه فعلی)' : ''}
                    </div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {session.last_used_at ? `آخرین فعالیت: ${when(session.last_used_at)}` : session.created_at ? when(session.created_at) : ''}
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      className="text-btn"
                      type="button"
                      onClick={() => void api(`/me/sessions/${session.id}`, { method: 'DELETE' })
                        .then(() => {
                          setSessions((rows) => rows.filter((row) => row.id !== session.id))
                          toast.show('نشست بسته شد', 'info')
                        })}
                    >
                      بستن
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {blocks.length > 0 && (
            <div style={{ padding: '10px 2px', borderBottom: '1px solid var(--line)' }}>
              <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>مسدودشده‌ها</p>
              {blocks.map((person) => person.id && (
                <div key={person.id} className="row between" style={{ padding: '4px 0' }}>
                  <Person user={person} />
                  <button
                    className="text-btn"
                    type="button"
                    onClick={() => void api(`/blocks/${person.id}`, { method: 'DELETE' })
                      .then(() => {
                        setBlocks((list) => list.filter((item) => item.id !== person.id))
                        toast.show('رفع مسدودیت انجام شد', 'info')
                      })}
                  >
                    رفع
                  </button>
                </div>
              ))}
            </div>
          )}
          <SettingsRow
            icon="chat"
            tone="cobalt"
            title="پشتیبانی طبیار"
            sub="ثبت و پیگیری تیکت پشتیبانی"
            onClick={() => setSupportOpen((value) => !value)}
          />
          {supportOpen && (
            <form className="stack" style={{ padding: '10px 2px', borderBottom: '1px solid var(--line)' }} onSubmit={(event) => {
              event.preventDefault()
              const target = event.currentTarget
              const form = Object.fromEntries(new FormData(target).entries())
              void api('/support-tickets', { method: 'POST', body: JSON.stringify(form) })
                .then(() => {
                  target.reset()
                  setSupportOpen(false)
                  loadTickets()
                  toast.show('درخواست پشتیبانی ثبت شد', 'success')
                })
                .catch((reason) => toast.show(errText(reason), 'error'))
            }}>
              <input className="input" name="subject" placeholder="موضوع" required />
              <textarea className="textarea" name="body" placeholder="شرح" required />
              <Button variant="primary" block type="submit">ارسال تیکت</Button>
            </form>
          )}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="row between" style={{ fontSize: 12.5, padding: '8px 2px', borderBottom: '1px solid var(--line)' }}>
              <b>{ticket.subject}</b>
              <span className="chip">{ticketStatusLabels[ticket.status] || ticket.status}</span>
            </div>
          ))}
          <SettingsRow
            icon="xCircle"
            tone="danger"
            danger
            title="خروج از حساب"
            sub="پایان نشست فعلی روی این دستگاه"
            trailing={null}
            onClick={() => setConfirmLogout(true)}
          />
        </div>

        <h2 className="section-title section-title--tight">درباره</h2>
        <div className="card settings-card">
          <div className="kv">
            <span className="k">نسخه وب</span>
            <span className="muted">۱.۰ · طبیار</span>
          </div>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.7, marginTop: 8 }}>
            طبیار شبکه اجتماعی پزشکان است. محتوای بالینی نمایشی جایگزین تشخیص یا درمان نیست.
          </p>
        </div>
      </div>
      <ConfirmSheet
        open={confirmLogout}
        title="خروج از حساب"
        text="آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟"
        confirmLabel="بله، خروج"
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          void logout()
        }}
      />
    </>
  )
}

export function Jobs() {
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')
  const [employment, setEmployment] = useState('')
  const [items, setItems] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams({ specialty, city, employment_type: employment })
    void api<{ data: Vacancy[] }>(`/jobs?${query}`)
      .then((payload) => setItems(payload.data))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [specialty, city, employment])

  return (
    <>
      <Top title="فرصت‌های شغلی" />
      <div className="screen-body pad stack">
        <div className="card stack">
          <div className="two">
            <input className="input" value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="تخصص (مثلاً قلب)" />
            <input className="input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="شهر" />
          </div>
          <select className="select" value={employment} onChange={(event) => setEmployment(event.target.value)}>
            <option value="">همه نوع همکاری</option>
            <option value="full_time">تمام‌وقت</option>
            <option value="part_time">پاره‌وقت</option>
            <option value="teaching">تدریس</option>
            <option value="collaboration">همکاری حرفه‌ای</option>
          </select>
        </div>

        {!loading && items.length === 0 && (
          <Empty icon="briefcase" title="آگهی‌ای یافت نشد" text="عبارت جست‌وجو یا فیلتر شهر و تخصص را تغییر دهید." />
        )}

        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.24) }}
          >
            <Link to={`/jobs/${item.id}`} className="card stack">
              <div className="job-card-head">
                <span className="job-org-badge"><Icon name="building" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 15, display: 'block' }}>{item.title}</b>
                  <span className="muted" style={{ fontSize: 12.5 }}>{item.organization.name}</span>
                </div>
              </div>
              <div className="job-meta-chips">
                <span className="chip chip-blue">{item.employment_label}</span>
                <span className="chip chip-teal">{item.specialty}</span>
                <span className="chip"><Icon name="mapPin" /> {item.city}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  )
}

export function JobPage() {
  const { id } = useParams()
  const toast = useToast()
  const [job, setJob] = useState<Vacancy | null>(null)
  useEffect(() => {
    api<{ data: Vacancy }>(`/jobs/${id}`).then((payload) => setJob(payload.data)).catch(() => undefined)
  }, [id])
  if (!job) return <SkelWait />
  return (
    <>
      <Top title="جزئیات آگهی" back />
      <div className="screen-body pad stack" style={{ paddingBottom: 90 }}>
        <div className="banner banner-success">
          <Icon name="shield" />
          <span>آگهی‌های نمونه برای نمایش جریان کاری هستند.</span>
        </div>
        <div className="card stack">
          <div className="job-card-head">
            <span className="job-org-badge"><Icon name="building" /></span>
            <div>
              <h2 style={{ fontSize: 18 }}>{job.title}</h2>
              <p className="muted" style={{ fontSize: 13 }}>{job.organization.name} · {job.organization.type_label}</p>
            </div>
          </div>
          <div className="job-meta-chips">
            <span className="chip chip-teal">{job.specialty}</span>
            <span className="chip chip-blue">{job.employment_label}</span>
            <span className="chip"><Icon name="mapPin" /> {job.city}</span>
          </div>
          <p style={{ lineHeight: 1.85, fontSize: 14 }}>{job.description}</p>
          {job.organization.about && (
            <p className="muted" style={{ fontSize: 13, borderTop: '1px solid var(--line)', paddingTop: 10 }}>{job.organization.about}</p>
          )}
        </div>
      </div>
      <div className="sticky-submit-bar">
        <div className="two">
          <Button
            variant="ghost"
            onClick={() => void api(`/jobs/${job.id}/save`, { method: job.saved ? 'DELETE' : 'POST' })
              .then(() => {
                setJob({ ...job, saved: !job.saved })
                toast.show(!job.saved ? 'آگهی ذخیره شد' : 'از ذخیره‌ها برداشته شد', 'info')
              })}
          >
            <Icon name="bookmark" filled={job.saved} /> {job.saved ? 'ذخیره شده' : 'ذخیره آگهی'}
          </Button>
          <Link className="btn btn-primary" to={`/jobs/${job.id}/apply`}>
            <Icon name="send" /> {job.applied ? 'ویرایش درخواست' : 'ارسال درخواست'}
          </Link>
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
  const toast = useToast()
  const [resume, setResume] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <Top title="درخواست همکاری" back />
      <form className="screen-body pad stack" onSubmit={(event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        const body = new FormData(event.currentTarget)
        if (resume) body.set('resume', resume)
        void api(`/jobs/${id}/apply`, { method: 'POST', body })
          .then(() => {
            toast.show('درخواست شما ارسال شد', 'success')
            navigate(`/jobs/${id}`)
          })
          .catch((reason) => setError(errText(reason)))
          .finally(() => setBusy(false))
      }}>
        <div className="card stack">
          <Field label="معرفی کوتاه" htmlFor="apply-cover">
            <textarea id="apply-cover" className="textarea" name="cover_letter" placeholder="معرفی کوتاه و سوابق مرتبط..." />
          </Field>
          <Field label="فایل رزومه (اختیاری)" help="فرمت PDF یا تصویر">
            <label className={resume ? 'file-dropzone has-file' : 'file-dropzone'}>
              <Icon name={resume ? 'check' : 'file'} />
              <strong>{resume ? resume.name : 'انتخاب فایل رزومه'}</strong>
              <span>برای انتخاب فایل کلیک کنید</span>
              <input hidden type="file" accept="application/pdf,image/*" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
          {error && <div className="error">{error}</div>}
          <Button variant="primary" block loading={busy} type="submit">ارسال درخواست</Button>
        </div>
      </form>
    </>
  )
}

export function Employer() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [jobs, setJobs] = useState<Vacancy[]>([])
  const [apps, setApps] = useState<{ id: number; status: string; applicant: UserCard; cover_letter: string | null }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
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
      <Top title="پنل کارفرما" action={<button className="text-btn" type="button" onClick={() => void logout()}>خروج</button>} />
      <div className="screen-body pad stack">
        {error && <div className="error">{error}</div>}
        {!ready && (
          <div className="banner banner-warn">
            <Icon name="clock" />
            <span>سازمان هنوز تأیید نشده است. پس از بررسی ادمین می‌توانید آگهی منتشر کنید.</span>
          </div>
        )}
        {ready && (
          <form className="card stack" onSubmit={(event) => {
            event.preventDefault()
            const target = event.currentTarget
            setBusy(true)
            const payload = Object.fromEntries(new FormData(target).entries())
            void api('/employer/jobs', { method: 'POST', body: JSON.stringify(payload) })
              .then(() => {
                target.reset()
                toast.show('آگهی منتشر شد', 'success')
                load()
              })
              .catch((reason) => setError(errText(reason)))
              .finally(() => setBusy(false))
          }}>
            <b style={{ fontSize: 15 }}>آگهی جدید</b>
            <input className="input" name="title" placeholder="عنوان" required />
            <div className="two">
              <input className="input" name="specialty" placeholder="تخصص" required />
              <input className="input" name="city" placeholder="شهر" required />
            </div>
            <select className="select" name="employment_type" defaultValue="full_time">
              <option value="full_time">تمام‌وقت</option>
              <option value="part_time">پاره‌وقت</option>
              <option value="teaching">تدریس</option>
              <option value="collaboration">همکاری</option>
            </select>
            <textarea className="textarea" name="description" placeholder="شرح آگهی" required />
            <Button variant="primary" block loading={busy} type="submit">انتشار آگهی</Button>
          </form>
        )}
        {jobs.map((job) => (
          <div key={job.id} className="card row between">
            <b>{job.title}</b>
            <span className="chip chip-blue">{job.applications_count || 0} درخواست</span>
          </div>
        ))}
        {apps.map((item) => (
          <div key={item.id} className="card stack">
            <div className="row between">
              <Person user={item.applicant} />
              <span className="chip">{item.applicant.role_label}</span>
            </div>
            {item.cover_letter && <p className="muted" style={{ fontSize: 13.5 }}>{item.cover_letter}</p>}
            <div className="row">
              {(['reviewing', 'accepted', 'rejected'] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={item.status === status ? 'primary' : 'ghost'}
                  type="button"
                  onClick={() => void api(`/employer/applications/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
                    .then(() => {
                      toast.show('وضعیت درخواست به‌روزرسانی شد', 'success')
                      load()
                    })}
                >
                  {status === 'reviewing' ? 'بررسی' : status === 'accepted' ? 'پذیرش' : 'رد'}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
