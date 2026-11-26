import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, assetUrl, when } from '../api'
import { useAuth } from '../auth'
import { Icon } from '../icons'
import { openUpgradeSheet } from '../pro'
import type { InsightsOverview, InsightsSeriesPoint, MetricValue, PostInsights } from '../types'
import { Button, Empty, ListSkel, Segmented, Top, errText } from '../ui'

const fa = new Intl.NumberFormat('fa-IR')

function formatDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { month: 'numeric', day: 'numeric' }).format(new Date(iso))
  } catch {
    return iso.slice(5)
  }
}

function DeltaPill({ metric }: { metric: MetricValue }) {
  if (metric.delta_pct == null) return <span className="insight-delta is-flat">بدون تغییر</span>
  if (metric.delta_pct > 0) return <span className="insight-delta is-up">+{fa.format(metric.delta_pct)}٪</span>
  if (metric.delta_pct < 0) return <span className="insight-delta is-down">{fa.format(metric.delta_pct)}٪</span>
  return <span className="insight-delta is-flat">۰٪</span>
}

function SvgBarChart({
  data,
  color = 'var(--cobalt)',
}: {
  data: { label: string; value: number }[]
  color?: string
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  if (data.length === 0) return null
  const max = Math.max(1, ...data.map((d) => d.value))
  const width = 320
  const height = 128
  const gap = 3
  const barW = Math.max(3, (width - gap * (data.length - 1)) / data.length)
  const picked = activeIdx != null ? data[activeIdx] : data[data.length - 1]

  return (
    <div className="stack" style={{ gap: 6 }}>
      {picked && (
        <div className="row between" style={{ fontSize: 12 }}>
          <span className="muted">{formatDay(picked.label)}</span>
          <b>{fa.format(picked.value)}</b>
        </div>
      )}
      <svg className="insight-svg-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="نمودار روند">
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="var(--line)" strokeWidth="1" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--line)" strokeDasharray="3 3" strokeWidth="1" />
        {data.map((item, idx) => {
          const h = Math.max(item.value > 0 ? 6 : 2, Math.round((item.value / max) * (height - 10)))
          const x = idx * (barW + gap)
          const y = height - h
          const isPicked = activeIdx === idx
          return (
            <rect
              key={item.label}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={Math.min(4, barW / 2)}
              fill={color}
              opacity={activeIdx == null || isPicked ? 0.92 : 0.4}
              onClick={() => setActiveIdx(idx)}
              style={{ cursor: 'pointer' }}
            />
          )
        })}
      </svg>
      <div className="row between faint" style={{ fontSize: 11 }}>
        <span>{formatDay(data[0].label)}</span>
        {data.length > 2 && <span>{formatDay(data[Math.floor(data.length / 2)].label)}</span>}
        <span>{formatDay(data[data.length - 1].label)}</span>
      </div>
    </div>
  )
}

export function InsightsPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<'7' | '30' | '90'>('7')
  const [chartMetric, setChartMetric] = useState<keyof Omit<InsightsSeriesPoint, 'date'>>('impressions')
  const [data, setData] = useState<InsightsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    void api<{ data: InsightsOverview }>(`/me/insights?range=${range}`)
      .then((payload) => setData(payload.data))
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 402) {
          setRange('7')
        } else {
          setError(errText(reason))
        }
      })
      .finally(() => setLoading(false))
  }, [range])

  const handleRangeChange = (next: '7' | '30' | '90') => {
    if (next !== '7' && !user?.is_pro) {
      openUpgradeSheet({ message: 'تحلیل بازه ۳۰ و ۹۰ روزه مخصوص اشتراک طبیار پرو است.' })
      return
    }
    setRange(next)
  }

  const chartData = (data?.series ?? []).map((row) => ({
    label: row.date,
    value: row[chartMetric],
  }))

  return (
    <>
      <Top title="آمار و اینسایت" back />
      <div className="screen-body pad insights-screen">
        <Segmented
          layoutId="insights-range"
          ariaLabel="بازه زمانی آمار"
          value={range}
          onChange={handleRangeChange}
          options={[
            { value: '7', label: '۷ روز اخیر' },
            { value: '30', label: user?.is_pro ? '۳۰ روز' : '۳۰ روز 🔒' },
            { value: '90', label: user?.is_pro ? '۹۰ روز' : '۹۰ روز 🔒' },
          ]}
        />

        {error && <div className="error">{error}</div>}
        {loading && !data && <ListSkel rows={6} />}

        {data && (
          <>
            <div className="insight-kpi-grid">
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>بازدید (Impressions)</span><Icon name="eye" /></div>
                <b>{fa.format(data.summary.impressions.value)}</b>
                <DeltaPill metric={data.summary.impressions} />
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>دسترسی (Reach)</span><Icon name="users" /></div>
                <b>{fa.format(data.summary.reach.value)}</b>
                <DeltaPill metric={data.summary.reach} />
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>حساب‌های درگیر</span><Icon name="heart" /></div>
                <b>{fa.format(data.summary.engaged_accounts.value)}</b>
                <DeltaPill metric={data.summary.engaged_accounts} />
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>بازدید پروفایل</span><Icon name="user" /></div>
                <b>{fa.format(data.summary.profile_views.value)}</b>
                <DeltaPill metric={data.summary.profile_views} />
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>دنبال‌کنندگان کل</span><Icon name="trend" /></div>
                <b>{fa.format(data.summary.followers_total)}</b>
                <span className="insight-delta is-up">+{fa.format(data.summary.followers_new.value)} جدید</span>
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>کل تعامل‌ها</span><Icon name="sparkles" /></div>
                <b>{fa.format(data.summary.engagements_total.value)}</b>
                <DeltaPill metric={data.summary.engagements_total} />
              </div>
            </div>

            <section className="insight-chart-card">
              <div className="row between">
                <b style={{ fontSize: 14.5 }}>روند روزانه</b>
                <span className="faint">{fa.format(data.summary.content_count)} محتوای جدید</span>
              </div>
              <div className="chips">
                {([
                  ['impressions', 'بازدید'],
                  ['reach', 'دسترسی'],
                  ['engagements', 'تعامل'],
                  ['followers', 'دنبال‌کننده'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={chartMetric === key ? 'chip chip-blue' : 'chip'}
                    onClick={() => setChartMetric(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SvgBarChart
                data={chartData}
                color={chartMetric === 'engagements' ? 'var(--teal)' : chartMetric === 'followers' ? 'var(--violet)' : 'var(--cobalt)'}
              />
            </section>

            <section className="card stack">
              <b style={{ fontSize: 14.5 }}>تفکیک تعامل‌ها</b>
              <div className="kv"><span className="k">پسندیدن (لایک)</span><b>{fa.format(data.breakdown.likes)}</b></div>
              <div className="kv"><span className="k">نظر روی پست‌ها</span><b>{fa.format(data.breakdown.comments)}</b></div>
              <div className="kv"><span className="k">ذخیره‌شدن</span><b>{fa.format(data.breakdown.bookmarks)}</b></div>
              <div className="kv"><span className="k">بازنشر (ریپست)</span><b>{fa.format(data.breakdown.reposts)}</b></div>
              <div className="kv"><span className="k">پاسخ در انجمن‌ها</span><b>{fa.format(data.breakdown.topic_replies)}</b></div>
              <div className="kv"><span className="k">رأی نظرسنجی</span><b>{fa.format(data.breakdown.poll_votes)}</b></div>
              <div className="kv"><span className="k">بازدید استوری</span><b>{fa.format(data.breakdown.story_views)}</b></div>
            </section>

            {data.is_pro ? (
              <>
                <section className="card stack">
                  <b style={{ fontSize: 14.5 }}>پست‌های برتر</b>
                  {(data.top_posts?.length ?? 0) === 0 ? (
                    <Empty icon="insights" title="داده‌ای نیست" text="پس از انتشار و دیده شدن پست‌ها، برترین‌ها اینجا می‌آیند." />
                  ) : (
                    data.top_posts?.map((post) => (
                      <Link key={post.id} className="list-row" to={`/insights/posts/${post.id}`}>
                        {post.cover_url
                          ? <img className="avatar" style={{ borderRadius: 10 }} src={assetUrl(post.cover_url) || post.cover_url} alt="" />
                          : <span className="settings-row-icon tone-cobalt"><Icon name="insights" /></span>}
                        <div className="body">
                          <div className="title" style={{ fontSize: 13.5 }}>{post.excerpt}</div>
                          <div className="sub">
                            {fa.format(post.impressions)} بازدید · {fa.format(post.reach)} دسترسی · {fa.format(post.engagements)} تعامل
                          </div>
                        </div>
                        <span className="settings-row-chev"><Icon name="chevronLeft" /></span>
                      </Link>
                    ))
                  )}
                </section>

                {data.audience && (
                  <section className="card stack">
                    <b style={{ fontSize: 14.5 }}>ترکیب مخاطبان ({fa.format(data.audience.total_followers)} دنبال‌کننده)</b>
                    {data.audience.roles.length === 0 ? (
                      <p className="muted" style={{ fontSize: 13 }}>هنوز دنبال‌کننده‌ای برای تحلیل ثبت نشده است.</p>
                    ) : (
                      <>
                        <p className="muted" style={{ fontSize: 12 }}>نقش‌های حرفه‌ای</p>
                        {data.audience.roles.map((row) => (
                          <div key={row.label} className="insight-demo-row">
                            <div className="insight-demo-head"><span>{row.label}</span><b>{fa.format(row.percent)}٪</b></div>
                            <div className="insight-demo-track"><div className="insight-demo-fill" style={{ width: `${row.percent}%` }} /></div>
                          </div>
                        ))}
                        {data.audience.specialties.length > 0 && (
                          <>
                            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>تخصص‌های پرتکرار</p>
                            {data.audience.specialties.map((row) => (
                              <div key={row.label} className="insight-demo-row">
                                <div className="insight-demo-head"><span>{row.label}</span><b>{fa.format(row.percent)}٪</b></div>
                                <div className="insight-demo-track"><div className="insight-demo-fill" style={{ width: `${row.percent}%` }} /></div>
                              </div>
                            ))}
                          </>
                        )}
                        {data.audience.cities.length > 0 && (
                          <>
                            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>شهرها</p>
                            {data.audience.cities.map((row) => (
                              <div key={row.label} className="insight-demo-row">
                                <div className="insight-demo-head"><span>{row.label}</span><b>{fa.format(row.percent)}٪</b></div>
                                <div className="insight-demo-track"><div className="insight-demo-fill" style={{ width: `${row.percent}%` }} /></div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </section>
                )}
              </>
            ) : (
              <section className="insight-lock-wrap">
                <div className="card stack insight-blur" aria-hidden="true">
                  <b>پست‌های برتر و ترکیب مخاطبان</b>
                  <div className="kv"><span className="k">متخصص قلب</span><b>۴۵٪</b></div>
                  <div className="kv"><span className="k">رزیدنت</span><b>۳۰٪</b></div>
                  <div className="kv"><span className="k">تهران</span><b>۶۰٪</b></div>
                </div>
                <div className="insight-lock-overlay">
                  <Icon name="crown" filled />
                  <b>تحلیل کامل مخاطبان و آمار تک‌تک پست‌ها</b>
                  <span className="muted" style={{ fontSize: 12.5 }}>با طبیار پرو، پست‌های برتر، تخصص مخاطبان و بازه‌های ۳۰ و ۹۰ روزه باز می‌شود.</span>
                  <Button size="sm" variant="primary" type="button" onClick={() => openUpgradeSheet({ message: 'اینسایت کامل و ترکیب مخاطبان مخصوص طبیار پرو است.' })}>
                    ارتقا به طبیار پرو
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}

export function PostInsightsPage() {
  const { id } = useParams()
  const [data, setData] = useState<PostInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPro, setNeedsPro] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    void api<{ data: PostInsights }>(`/posts/${id}/insights`)
      .then((payload) => setData(payload.data))
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 402) {
          setNeedsPro(true)
        } else {
          setError(errText(reason))
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <>
      <Top title="آمار پست" back />
      <div className="screen-body pad insights-screen">
        {loading && <ListSkel rows={5} />}
        {error && <div className="error">{error}</div>}
        {needsPro && (
          <Empty
            icon="crown"
            title="آمار پست مخصوص طبیار پرو"
            text="برای مشاهده بازدید، دسترسی، نرخ تعامل و منبع بازدیدهای هر پست، اشتراک پرو را فعال کنید."
            action={
              <Button variant="primary" size="sm" type="button" onClick={() => openUpgradeSheet({ message: 'آمار اختصاصی هر پست مخصوص اشتراک پرو است.' })}>
                ارتقا به طبیار پرو
              </Button>
            }
          />
        )}
        {data && (
          <>
            <Link to={`/posts/${data.post.id}`} className="card row" style={{ gap: 12 }}>
              {data.post.cover_url && (
                <img className="avatar" style={{ borderRadius: 10 }} src={assetUrl(data.post.cover_url) || data.post.cover_url} alt="" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 14 }}>{data.post.excerpt}</b>
                {data.post.created_at && <span className="faint" style={{ fontSize: 11.5 }}>{when(data.post.created_at)}</span>}
              </div>
            </Link>

            <div className="insight-kpi-grid">
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>بازدید</span><Icon name="eye" /></div>
                <b>{fa.format(data.summary.impressions)}</b>
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>دسترسی (Reach)</span><Icon name="users" /></div>
                <b>{fa.format(data.summary.reach)}</b>
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>نرخ تعامل</span><Icon name="trend" /></div>
                <b>{fa.format(data.summary.engagement_rate)}٪</b>
              </div>
              <div className="insight-kpi">
                <div className="insight-kpi-head"><span>کل تعامل</span><Icon name="heart" /></div>
                <b>{fa.format(data.summary.engagements)}</b>
              </div>
            </div>

            <section className="insight-chart-card">
              <b style={{ fontSize: 14.5 }}>بازدید ۱۴ روز اخیر</b>
              <SvgBarChart data={data.series.map((row) => ({ label: row.date, value: row.impressions }))} />
            </section>

            <section className="card stack">
              <b style={{ fontSize: 14.5 }}>جزئیات تعامل</b>
              <div className="kv"><span className="k">لایک</span><b>{fa.format(data.summary.likes)}</b></div>
              <div className="kv"><span className="k">نظر</span><b>{fa.format(data.summary.comments)}</b></div>
              <div className="kv"><span className="k">ذخیره</span><b>{fa.format(data.summary.bookmarks)}</b></div>
              <div className="kv"><span className="k">بازنشر</span><b>{fa.format(data.summary.reposts)}</b></div>
            </section>

            {data.sources.length > 0 && (
              <section className="card stack">
                <b style={{ fontSize: 14.5 }}>منبع بازدیدها</b>
                {data.sources.map((row) => (
                  <div key={row.source} className="insight-demo-row">
                    <div className="insight-demo-head"><span>{row.label}</span><b>{fa.format(row.count)} ({fa.format(row.percent)}٪)</b></div>
                    <div className="insight-demo-track"><div className="insight-demo-fill" style={{ width: `${row.percent}%` }} /></div>
                  </div>
                ))}
              </section>
            )}

            {data.roles.length > 0 && (
              <section className="card stack">
                <b style={{ fontSize: 14.5 }}>نقش حساب‌های درگیر</b>
                {data.roles.map((row) => (
                  <div key={row.label} className="insight-demo-row">
                    <div className="insight-demo-head"><span>{row.label}</span><b>{fa.format(row.percent)}٪</b></div>
                    <div className="insight-demo-track"><div className="insight-demo-fill" style={{ width: `${row.percent}%` }} /></div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
