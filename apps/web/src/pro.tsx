import { useEffect, useState } from 'react'
import { api, when } from './api'
import { useAuth } from './auth'
import { Icon } from './icons'
import type { QuotaItem, QuotaKey, SubscriptionOverview } from './types'
import { Button, Field, Sheet, errText, useToast } from './ui'

const fa = new Intl.NumberFormat('fa-IR')

type UpgradeDetail = {
  message?: string
  quota?: QuotaItem
}

export function openUpgradeSheet(detail?: UpgradeDetail) {
  window.dispatchEvent(new CustomEvent('tebyar:upgrade', { detail }))
}

export function QuotaHint({ quotaKey }: { quotaKey: QuotaKey }) {
  const { user } = useAuth()
  if (!user || user.is_pro || !user.quotas || user.quotas.is_exempt) return null
  const item = user.quotas.items[quotaKey]
  if (!item || item.limit == null) return null
  const remaining = Math.max(0, item.limit - item.used)

  return (
    <div className={item.exceeded ? 'quota-hint is-full' : 'quota-hint'}>
      <div className="quota-hint-info">
        <Icon name={item.exceeded ? 'lock' : 'crown'} filled={!item.exceeded} />
        <span>
          {item.exceeded
            ? `سقف رایگان ${item.label} (${fa.format(item.limit)}) پر شده است.`
            : `${fa.format(remaining)} از ${fa.format(item.limit)} سهمیه رایگان ${item.label} باقی مانده`}
        </span>
      </div>
      <button
        type="button"
        className="text-btn"
        style={{ fontSize: 12, padding: '2px 6px', flexShrink: 0 }}
        onClick={() => openUpgradeSheet({ quota: item })}
      >
        ارتقا به پرو
      </button>
    </div>
  )
}

export function UpgradeSheet() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<UpgradeDetail | undefined>
      setReason(custom.detail?.message || '')
      setError('')
      setOpen(true)
    }
    window.addEventListener('tebyar:upgrade', handler)
    return () => window.removeEventListener('tebyar:upgrade', handler)
  }, [])

  useEffect(() => {
    if (!open || !user || user.account_status !== 'verified' || user.role === 'employer') return
    setLoading(true)
    void api<{ data: SubscriptionOverview }>('/subscription')
      .then((payload) => {
        setOverview(payload.data)
        if (!selectedPlan && payload.data.plans.length > 0) {
          setSelectedPlan(payload.data.plans[0].slug)
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [open, user])

  if (!user) return null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedPlan || busy) return
    setBusy(true)
    setError('')
    void api<{ message: string }>('/subscription/requests', {
      method: 'POST',
      body: JSON.stringify({ plan: selectedPlan, reference: reference.trim() || null }),
    })
      .then((payload) => {
        setReference('')
        toast.show(payload.message || 'درخواست ثبت شد', 'success')
        return Promise.all([
          refresh(),
          api<{ data: SubscriptionOverview }>('/subscription').then((res) => setOverview(res.data)),
        ])
      })
      .catch((err) => setError(errText(err)))
      .finally(() => setBusy(false))
  }

  const quotaRows = overview?.quotas ? Object.values(overview.quotas.items) : []

  return (
    <Sheet open={open} onClose={() => setOpen(false)} front>
      <div className="stack">
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          <span className="pro-badge"><Icon name="crown" filled /> طبیار پرو</span>
        </div>
        <h2 style={{ margin: '2px 0 4px' }}>
          {overview?.is_pro || user.is_pro ? 'وضعیت اشتراک طبیار پرو' : 'ارتقا به اشتراک طبیار پرو'}
        </h2>

        {reason && (
          <div className="banner banner-warn" style={{ margin: 0 }}>
            <Icon name="lock" />
            <span>{reason}</span>
          </div>
        )}

        {(overview?.is_pro || user.is_pro) && (
          <div className="banner banner-success" style={{ margin: 0 }}>
            <Icon name="crown" filled />
            <span>
              اشتراک پرو برای حساب شما فعال است
              {(overview?.pro_until || user.pro_until) ? ` (تا ${when(overview?.pro_until || user.pro_until)})` : ''}.
            </span>
          </div>
        )}

        <div className="pro-perks">
          <div className="pro-perk"><Icon name="check" /><span>انتشار نامحدود پست، استوری، کیس و نظر</span></div>
          <div className="pro-perk"><Icon name="check" /><span>آغاز گفتگوی دایرکت و گروه بدون محدودیت</span></div>
          <div className="pro-perk"><Icon name="check" /><span>آمار و اینسایت ۳۰ و ۹۰ روزه و تحلیل دقیق هر پست</span></div>
          <div className="pro-perk"><Icon name="check" /><span>نشان ویژه پرو در پروفایل حرفه‌ای</span></div>
        </div>

        {!user.is_pro && !overview?.quotas?.is_exempt && quotaRows.length > 0 && (
          <div className="quota-list">
            {quotaRows.map((item) => {
              const limit = item.limit ?? 0
              const pct = limit > 0 ? Math.min(100, Math.round((item.used / limit) * 100)) : 0
              return (
                <div key={item.key} className="quota-row">
                  <div className="quota-row-head">
                    <span>{item.label}</span>
                    <b className={item.exceeded ? 'is-full' : ''}>
                      {limit > 0 ? `${fa.format(item.used)} از ${fa.format(limit)}` : fa.format(item.used)}
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

        {loading && !overview && <p className="muted center" style={{ fontSize: 13 }}>در حال دریافت طرح‌ها...</p>}

        {overview?.pending ? (
          <div className="banner banner-info" style={{ margin: 0 }}>
            <Icon name="clock" />
            <span>
              درخواست «{overview.pending.plan}» ثبت شده و در انتظار بررسی و فعال‌سازی توسط تیم طبیار است.
            </span>
          </div>
        ) : overview && !overview.is_pro && (
          <form className="stack" onSubmit={submit}>
            <div className="pro-plan-grid">
              {overview.plans.map((plan) => {
                const active = selectedPlan === plan.slug
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    className={active ? 'pro-plan-card is-on' : 'pro-plan-card'}
                    onClick={() => setSelectedPlan(plan.slug)}
                  >
                    <b>{plan.title}</b>
                    <span>
                      {plan.amount > 0 ? `${fa.format(plan.amount)} تومان` : `${fa.format(plan.months)} ماه · ثبت درخواست`}
                    </span>
                  </button>
                )
              })}
            </div>

            {overview.payment_note && (
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.7 }}>{overview.payment_note}</p>
            )}

            <Field label="کد پیگیری یا توضیح (اختیاری)" htmlFor="pro-ref">
              <input
                id="pro-ref"
                className="input"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="در صورت واریز، شماره پیگیری را بنویسید"
              />
            </Field>

            {error && <div className="error">{error}</div>}
            <Button variant="primary" block loading={busy} type="submit">
              ثبت درخواست ارتقا به پرو
            </Button>
          </form>
        )}
      </div>
    </Sheet>
  )
}
