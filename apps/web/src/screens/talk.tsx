import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { api, when } from '../api'
import { readCache, writeCache } from '../cache'
import { useAuth } from '../auth'
import { Icon } from '../icons'
import { QuotaHint } from '../pro'
import type { ChatMessage, CommunityCard, Conversation, Me, Post, Topic, UserCard } from '../types'
import { Avatar, Button, ConfirmSheet, Empty, Field, ListSkel, Sheet, Top, VerifiedSeal, errText, useToast } from '../ui'
import { PostGrid, PostViewer } from '../post-ui'
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
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<Conversation[]>(() => readCache<Conversation[]>(conversationsKey) ?? [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(() => readCache<Conversation[]>(conversationsKey) == null)
  const [query, setQuery] = useState('')
  const [dmOpen, setDmOpen] = useState(false)
  const [dmQuery, setDmQuery] = useState('')
  const [dmHits, setDmHits] = useState<UserCard[]>([])
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberHits, setMemberHits] = useState<UserCard[]>([])
  const [picked, setPicked] = useState<UserCard[]>([])
  const [groupBusy, setGroupBusy] = useState(false)

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
    if (!dmOpen) return
    const timer = window.setTimeout(() => {
      const q = dmQuery.trim()
      if (q) {
        void api<{ doctors: UserCard[] }>(`/search?q=${encodeURIComponent(q)}`)
          .then((payload) => setDmHits(payload.doctors.filter((d) => d.id !== user?.id)))
          .catch(() => setDmHits([]))
      } else {
        void api<{ data: UserCard[] }>('/connections')
          .then((payload) => setDmHits(payload.data))
          .catch(() => setDmHits([]))
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [dmOpen, dmQuery, user?.id])

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
        back
        action={(
          <>
            <button className="icon-btn" type="button" aria-label="پیام جدید" onClick={() => setDmOpen(true)}>
              <Icon name="edit" />
            </button>
            <button className="icon-btn" type="button" aria-label="گروه جدید" onClick={() => setGroupOpen(true)}>
              <Icon name="users" />
            </button>
          </>
        )}
      />
      <div className="screen-body pad messages-list">
        <div className="field">
          <label className="sr-only" htmlFor="qm">جست‌وجوی گفتگو</label>
          <input className="input" id="qm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در پیام‌ها..." />
        </div>
        {error && <div className="error">{error}</div>}
        {loading && items.length === 0 && <ListSkel rows={8} />}
        {!loading && filtered.length === 0 && (
          <Empty
            icon="chat"
            title="پیامی نیست"
            text="گفتگوهای خصوصی و گروهی با همکاران اینجا نمایش داده می‌شوند."
            action={<Button variant="primary" size="sm" onClick={() => setDmOpen(true)}>شروع گفت‌وگو</Button>}
          />
        )}
        <div className="card" style={{ padding: filtered.length > 0 ? '4px 10px' : 0, display: filtered.length > 0 ? 'block' : 'none' }}>
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
                <div className="title">{rowTitle(item)}{item.type === 'group' && <span className="chip chip-blue">گروه</span>}</div>
                <div className="sub">{item.last_message?.body || 'بدون پیام'}</div>
              </div>
              <span className="time">{item.last_message?.created_at ? when(item.last_message.created_at) : ''}</span>
              {item.unread && <span className="unread-dot" aria-label="خوانده‌نشده" />}
            </button>
          ))}
        </div>
      </div>

      <Sheet open={dmOpen} onClose={() => setDmOpen(false)}>
        <div className="stack">
          <h2>پیام شخصی جدید</h2>
          <QuotaHint quotaKey="conversations" />
          <input className="input" value={dmQuery} onChange={(event) => setDmQuery(event.target.value)} placeholder="جست‌وجوی نام، تخصص یا شهر همکار..." autoFocus />
          {dmHits.length === 0 && <p className="muted center" style={{ padding: 12 }}>همکاری پیدا نشد. نام همکار را جست‌وجو کنید.</p>}
          {dmHits.map((doctor) => (
            <button
              key={doctor.id}
              className="list-row"
              type="button"
              onClick={() => {
                if (!doctor.id) return
                void api<{ data: Conversation }>('/conversations', {
                  method: 'POST',
                  body: JSON.stringify({ user_id: doctor.id }),
                }).then((payload) => {
                  setDmOpen(false)
                  setDmQuery('')
                  navigate(`/messages/${payload.data.id}`)
                }).catch((reason) => {
                  setDmOpen(false)
                  toast.show(errText(reason), 'error')
                })
              }}
            >
              <Avatar user={doctor} />
              <div className="body">
                <div className="title">{doctor.name}</div>
                <div className="sub">{doctor.specialty_title || doctor.role_label}</div>
              </div>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={groupOpen} onClose={() => setGroupOpen(false)}>
        <div className="stack">
          <h2>گروه جدید</h2>
          <QuotaHint quotaKey="conversations" />
          <input className="input" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="نام گروه" />
          <input className="input" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="جست‌وجو بین دنبال‌کننده‌ها و دنبال‌شده‌ها" />
          {memberHits.length === 0 && <p className="muted center">کسی در دنبال‌کردن‌های شما پیدا نشد.</p>}
          {memberHits.map((doctor) => {
            const selected = picked.some((row) => row.id === doctor.id)
            return (
              <button
                key={doctor.id}
                className="sheet-item"
                type="button"
                onClick={() => {
                  if (!doctor.id) return
                  if (selected) setPicked((rows) => rows.filter((r) => r.id !== doctor.id))
                  else setPicked((rows) => [...rows, doctor])
                }}
              >
                <Avatar user={doctor} small />
                <span style={{ flex: 1 }}>{doctor.name}</span>
                {selected && <span className="chip chip-teal"><Icon name="check" /> انتخاب</span>}
              </button>
            )
          })}
          {picked.length > 0 && <p className="muted" style={{ fontSize: 12.5 }}>اعضا: {picked.map((row) => row.name).join('، ')}</p>}
          <Button
            variant="primary"
            block
            loading={groupBusy}
            disabled={!groupTitle.trim() || picked.length === 0}
            type="button"
            onClick={() => {
              const ids = picked.map((row) => row.id).filter((value): value is number => value != null)
              if (!groupTitle.trim() || ids.length === 0) return
              setGroupBusy(true)
              void api<{ data: Conversation }>('/conversations/groups', {
                method: 'POST',
                body: JSON.stringify({ title: groupTitle.trim(), user_ids: ids }),
              }).then((payload) => {
                setGroupOpen(false)
                setGroupTitle('')
                setPicked([])
                void refresh()
                navigate(`/messages/${payload.data.id}`)
              }).catch((reason) => toast.show(errText(reason), 'error'))
                .finally(() => setGroupBusy(false))
            }}
          >
            ساخت گروه
          </Button>
        </div>
      </Sheet>
    </>
  )
}

export function Chat() {
  const { id } = useParams()
  const { user, refresh } = useAuth()
  const toast = useToast()
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
          ? <button className="icon-btn" type="button" aria-label="اعضای گروه" onClick={() => setManage(true)}><Icon name="users" /></button>
          : undefined}
      />
      <div className="screen-body chat-screen">
        <div className="thread" ref={threadRef}>
          {error && <div className="error">{error}</div>}
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className={message.mine ? 'bubble me' : 'bubble them'}
            >
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
            </motion.div>
          ))}
        </div>
        <form
          className="composer-bar"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const outgoing = text.trim()
            const hasFile = (fileRef.current?.files?.length ?? 0) > 0
            if (!outgoing && !hasFile) return
            if (outgoing) form.set('body', outgoing)
            const pending = -Date.now()
            if (outgoing) {
              setMessages((rows) => [...rows, {
                id: pending,
                body: outgoing,
                mine: true,
                read: false,
                attachment_url: null,
                attachment_name: null,
                created_at: new Date().toISOString(),
              }])
              setText('')
            }
            void api<{ data: ChatMessage }>(`/conversations/${id}/messages`, { method: 'POST', body: form })
              .then((sent) => {
                setMessages((rows) => rows.map((row) => row.id === pending ? { ...sent.data, mine: true } : row))
                if (fileRef.current) fileRef.current.value = ''
                if (messages.length === 0) void refresh()
              })
              .catch((reason) => {
                setMessages((rows) => rows.filter((row) => row.id !== pending))
                setText(outgoing)
                toast.show(errText(reason), 'error')
              })
          }}
        >
          <button className="icon-btn" type="button" aria-label="پیوست" onClick={() => fileRef.current?.click()}>
            <Icon name="paperclip" />
          </button>
          <input ref={fileRef} className="composer-file" name="attachment" type="file" accept="image/*,application/pdf" tabIndex={-1} />
          <input className="input" name="body" value={text} onChange={(event) => setText(event.target.value)} placeholder="پیام..." aria-label="متن پیام" />
          <button className="icon-btn" style={{ background: text.trim() ? 'var(--cobalt)' : undefined, color: text.trim() ? '#fff' : undefined }} type="submit" aria-label="ارسال">
            <Icon name="send" />
          </button>
        </form>
      </div>
      <Sheet open={manage && conversation?.type === 'group'} onClose={() => setManage(false)}>
        <div className="stack">
          <h2>اعضای گروه</h2>
          {conversation?.members?.map((member) => (
            <div key={member.id} className="row between" style={{ padding: '4px 0' }}>
              <span>{member.name}</span>
              {member.id !== user?.id && (
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => void api(`/conversations/${id}/members/${member.id}`, { method: 'DELETE' }).then(load).catch((reason) => toast.show(errText(reason), 'error'))}
                >
                  حذف
                </button>
              )}
            </div>
          ))}
          <input className="input" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="افزودن از دنبال‌کننده‌ها و دنبال‌شده‌ها" />
          {memberHits.length === 0 && <p className="muted center">کسی در این فهرست نیست.</p>}
          {memberHits.map((doctor) => (
            <button
              key={doctor.id}
              className="sheet-item"
              type="button"
              onClick={() => void api(`/conversations/${id}/members`, { method: 'POST', body: JSON.stringify({ user_id: doctor.id }) }).then(() => { setMemberQuery(''); load() }).catch((reason) => toast.show(errText(reason), 'error'))}
            >
              <Icon name="plus" /> افزودن {doctor.name}
            </button>
          ))}
        </div>
      </Sheet>
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
  const items = [
    { key: 'posts' as const, label: 'پست', icon: 'home' },
    { key: 'reposts' as const, label: 'ریپست', icon: 'repost' },
    { key: 'communities' as const, label: 'انجمن', icon: 'users' },
  ]
  return (
    <>
      <nav className="profile-segments" aria-label="بخش‌های پروفایل">
        {items.map((item) => {
          const active = tab === item.key
          return (
            <button key={item.key} className={active ? 'segment is-on' : 'segment'} type="button" onClick={() => setTab(item.key)}>
              {active && (
                <motion.span
                  layoutId="profile-seg-pill"
                  className="seg-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="profile-tab-panel">
        {tab === 'posts' && (
          <>
            {payload.posts.length === 0 && <Empty icon="image" title="پستی نیست" text="اولین پست را از دکمه انتشار بسازید." />}
            <PostGrid posts={payload.posts} aspect="portrait" impressionSource="profile" />
          </>
        )}
        {tab === 'reposts' && (
          <>
            {payload.reposts.length === 0 && <Empty icon="repost" title="ریپوستی نیست" text="بازنشرهای شما اینجا نمایش داده می‌شود." />}
            <PostGrid posts={payload.reposts} aspect="portrait" impressionSource="profile" />
          </>
        )}
        {tab === 'communities' && (
          <div className="pad">
            {payload.communities.length === 0 && <Empty icon="users" title="عضو انجمن نیستید" text="از تب انجمن‌ها به تخصص‌های مورد علاقه بپیوندید." />}
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

const faCount = new Intl.NumberFormat('fa-IR')

const entryIcons: Record<string, string> = {
  education: 'graduation',
  experience: 'briefcase',
  publication: 'book',
  certificate: 'award',
  talk: 'award',
  skill: 'check',
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
  const navigate = useNavigate()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null)
  const [followList, setFollowList] = useState<UserCard[]>([])
  const [followLoading, setFollowLoading] = useState(false)
  const roleOrSpec = user.specialty_title || user.role_label
  const hasEntries = (user.entries?.length ?? 0) > 0

  const openFollowList = (kind: 'followers' | 'following') => {
    if (!user.id) return
    setFollowModal(kind)
    setFollowLoading(true)
    setFollowList([])
    void api<{ data: UserCard[] }>(`/doctors/${user.id}/${kind}`)
      .then((payload) => setFollowList(payload.data))
      .catch(() => setFollowList([]))
      .finally(() => setFollowLoading(false))
  }

  return (
    <div className="profile-layout">
      <header className="profile-hero-card">
        <div className="profile-cover" aria-hidden="true" />
        <div className="profile-hero-inner">
          <div className="profile-avatar-wrap">
            <Avatar user={user} large />
          </div>
          <div className="profile-name-row">
            <h1>{user.name}</h1>
            <VerifiedSeal user={user} />
            {user.is_pro && (
              <span className="pro-badge"><Icon name="crown" filled /> پرو</span>
            )}
          </div>
          {user.headline && <p className="profile-headline">{user.headline}</p>}
          {(roleOrSpec || user.city) && (
            <p className="profile-sub">
              {roleOrSpec && <span>{roleOrSpec}</span>}
              {roleOrSpec && user.city && <span aria-hidden="true">·</span>}
              {user.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="mapPin" />{user.city}</span>}
            </p>
          )}
          <div className="profile-badges-row">
            {user.open_to_work && (
              <span className="chip chip-teal"><Icon name="briefcase" /> آماده همکاری</span>
            )}
            {user.specialty_title && (
              <span className={user.badges.specialty ? 'chip chip-teal' : 'chip chip-blue'}>
                {user.badges.specialty && <Icon name="check" />}
                تخصص {user.badges.specialty ? 'تأییدشده' : 'خوداظهاری'}
              </span>
            )}
            {user.badges.education && !user.badges.license && (
              <span className="chip chip-violet"><Icon name="graduation" /> هویت تحصیلی</span>
            )}
          </div>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <div className="profile-stats-bar">
            <div><b>{faCount.format(user.posts_count)}</b><span>پست</span></div>
            <button type="button" className="profile-stat-btn" onClick={() => openFollowList('followers')}>
              <b>{faCount.format(user.followers_count)}</b><span>دنبال‌کننده</span>
            </button>
            <button type="button" className="profile-stat-btn" onClick={() => openFollowList('following')}>
              <b>{faCount.format(user.following_count)}</b><span>دنبال‌شده</span>
            </button>
          </div>
          <div className="profile-actions">{actions}</div>
          <button
            className={aboutOpen ? 'profile-about-toggle is-open' : 'profile-about-toggle'}
            type="button"
            onClick={() => setAboutOpen((v) => !v)}
          >
            <span>{aboutOpen ? 'بستن سوابق' : hasEntries ? 'سوابق علمی و حرفه‌ای' : 'اطلاعات و اعتبارسنجی'}</span>
            <Icon name="chevronDown" />
          </button>
          {aboutOpen && (
            <div className="profile-about">
              <AboutSection user={user} />
              <p className="profile-disclaimer">نشان آبی فقط تأیید هویت فردی است. اعتبار علمی جدا نمایش داده می‌شود.</p>
            </div>
          )}
        </div>
      </header>
      {children}
      <Sheet open={followModal != null} onClose={() => setFollowModal(null)}>
        <div className="stack">
          <h2>{followModal === 'followers' ? 'دنبال‌کنندگان' : 'دنبال‌شده‌ها'}</h2>
          {followLoading && <ListSkel rows={4} />}
          {!followLoading && followList.length === 0 && (
            <p className="muted center">فهرست خالی است.</p>
          )}
          {followList.map((person) => (
            <button
              key={person.id}
              className="list-row"
              type="button"
              onClick={() => {
                setFollowModal(null)
                if (person.is_self) navigate('/profile')
                else if (person.slug) navigate(`/doctors/${person.slug}`)
              }}
            >
              <Avatar user={person} />
              <div className="body">
                <div className="title">{person.name}</div>
                <div className="sub">{person.specialty_title || person.role_label}</div>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
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
      <Top
        title="پروفایل"
        action={(
          <Link className="icon-btn" to="/settings" aria-label="تنظیمات و منو">
            <Icon name="menu" />
          </Link>
        )}
      />
      <div className="screen-body profile-screen">
        <ProfileLayout
          user={user}
          actions={(
            <>
              <Link className="btn btn-ghost" to="/profile/edit"><Icon name="edit" /> ویرایش</Link>
              <Link className="btn btn-ghost" to="/insights"><Icon name="insights" /> آمار</Link>
              <Link className="btn btn-primary" to="/messages"><Icon name="direct" /> پیام‌ها</Link>
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
  const toast = useToast()
  const [user, setUser] = useState<UserCard | null>(null)
  const [payload, setPayload] = useState<ProfilePayload>({ posts: [], reposts: [], topics: [], communities: [] })
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

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
      <Top
        title={user?.name || 'پروفایل'}
        back
        action={user && !user.is_self && user.id ? (
          <button className="icon-btn" type="button" aria-label="گزینه‌های پروفایل" onClick={() => setMenuOpen(true)}>
            <Icon name="more" />
          </button>
        ) : undefined}
      />
      <div className="screen-body profile-screen">
        {error && <div className="error pad">{error}</div>}
        {!user && !error && <div className="pad"><ListSkel rows={5} /></div>}
        {user && (
          <ProfileLayout
            user={user}
            actions={!user.is_self ? (
              <>
                <Button
                  variant={user.is_following ? 'ghost' : 'primary'}
                  type="button"
                  onClick={() => void api(`/doctors/${user.id}/follow`, { method: user.is_following ? 'DELETE' : 'POST' })
                    .then(() => {
                      toast.show(user.is_following ? 'دنبال‌کردن لغو شد' : 'دنبال شد', 'info')
                      load()
                    })}
                >
                  {user.is_following ? 'دنبال می‌کنید' : 'دنبال کردن'}
                </Button>
                {user.id && (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => {
                      setError('')
                      void api<{ data: Conversation }>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: user.id }) })
                        .then((row) => navigate(`/messages/${row.data.id}`))
                        .catch((reason) => toast.show(errText(reason), 'error'))
                    }}
                  >
                    <Icon name="chat" /> پیام شخصی
                  </Button>
                )}
              </>
            ) : <span />}
          >
            <ProfileTabs payload={payload} onChange={load} />
          </ProfileLayout>
        )}
      </div>

      <Sheet open={menuOpen && Boolean(user?.id)} onClose={() => setMenuOpen(false)}>
        <div className="stack">
          <button
            className="sheet-item"
            type="button"
            onClick={() => {
              if (!user?.id) return
              setMenuOpen(false)
              void api('/reports', { method: 'POST', body: JSON.stringify({ type: 'user', id: user.id, reason: 'other' }) })
                .then(() => toast.show('گزارش کاربر برای بررسی ثبت شد', 'info'))
                .catch((reason) => toast.show(errText(reason), 'error'))
            }}
          >
            <Icon name="shield" /> گزارش کاربر
          </button>
          <button
            className="sheet-item danger"
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setConfirmBlock(true)
            }}
          >
            <Icon name="xCircle" /> مسدود کردن کاربر
          </button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmBlock && Boolean(user?.id)}
        title={`مسدود کردن ${user?.name || 'کاربر'}`}
        text="این کاربر دیگر نمی‌تواند به شما پیام بدهد یا محتوای شما را ببیند."
        confirmLabel="بله، مسدود شود"
        onClose={() => setConfirmBlock(false)}
        onConfirm={() => {
          if (!user?.id) return
          setConfirmBlock(false)
          void api('/blocks', { method: 'POST', body: JSON.stringify({ user_id: user.id }) })
            .then(() => {
              toast.show('کاربر مسدود شد', 'info')
              navigate(-1)
            })
            .catch((reason) => toast.show(errText(reason), 'error'))
        }}
      />
    </>
  )
}

function AboutSection({ user }: { user: UserCard | Me }) {
  const entries = user.entries || []
  return (
    <div className="about-card">
      {entries.length > 0 ? (
        <div className="profile-entries-list">
          {entries.map((entry) => (
            <div key={entry.id} className="profile-entry-item">
              <span className="profile-entry-icon">
                <Icon name={entryIcons[entry.kind] || 'award'} />
              </span>
              <div className="profile-entry-body">
                <div className="profile-entry-kind">{entryLabels[entry.kind] || entry.kind}</div>
                <div className="profile-entry-title">{entry.title}</div>
                {(entry.subtitle || entry.year) && (
                  <div className="profile-entry-sub">{[entry.subtitle, entry.year].filter(Boolean).join(' · ')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13 }}>سابقه علمی یا حرفه‌ای هنوز ثبت نشده است.</p>
      )}
    </div>
  )
}

export function EditProfile() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingEntry, setAddingEntry] = useState(false)
  if (!user) return null
  return (
    <>
      <Top title="ویرایش پروفایل" back />
      <div className="screen-body pad stack-lg">
        {error && <div className="error">{error}</div>}
        <div className="card profile-edit-hero">
          <Avatar user={user} large />
          <form
            className="avatar-upload"
            onSubmit={(event) => {
              event.preventDefault()
              const body = new FormData(event.currentTarget)
              void api('/me/avatar', { method: 'POST', body })
                .then(() => {
                  toast.show('تصویر پروفایل به‌روزرسانی شد', 'success')
                  return refresh()
                })
                .catch((reason) => setError(errText(reason)))
            }}
          >
            <label className="btn btn-ghost btn-sm">
              <Icon name="camera" /> تغییر عکس پروفایل
              <input className="sr-only" name="avatar" type="file" accept="image/*" required onChange={(event) => {
                if (event.target.files?.length) event.currentTarget.form?.requestSubmit()
              }} />
            </label>
          </form>
        </div>

        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault()
            setSaving(true)
            const form = new FormData(event.currentTarget)
            const payload = Object.fromEntries(form.entries())
            void api('/me', { method: 'PATCH', body: JSON.stringify(payload) })
              .then(() => {
                toast.show('مشخصات ذخیره شد', 'success')
                return refresh()
              })
              .catch((reason) => setError(errText(reason)))
              .finally(() => setSaving(false))
          }}
        >
          <Field label="نام نمایشی" htmlFor="en"><input className="input" id="en" name="name" defaultValue={user.name} /></Field>
          <Field label="بیوگرافی حرفه‌ای" htmlFor="eb"><textarea className="textarea" id="eb" name="bio" defaultValue={user.bio || ''} style={{ minHeight: 90 }} /></Field>
          <Field label="عنوان / محل کار" htmlFor="ew"><input className="input" id="ew" name="headline" defaultValue={user.headline || ''} /></Field>
          <div className="two">
            <Field label="شهر" htmlFor="ec"><input className="input" id="ec" name="city" defaultValue={user.city || ''} /></Field>
            <Field label="تخصص" htmlFor="es"><input className="input" id="es" name="specialty_title" defaultValue={user.specialty_title || ''} /></Field>
          </div>
          <div className="banner banner-info" style={{ margin: 0 }}>
            <Icon name="shield" />
            <span>شماره نظام و مدارک حساس در اطلاعات عمومی پروفایل نمایش داده نمی‌شوند.</span>
          </div>
          <Button variant="primary" block loading={saving} type="submit">ذخیره تغییرات</Button>
        </form>

        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault()
            const target = event.currentTarget
            setAddingEntry(true)
            const form = Object.fromEntries(new FormData(target).entries())
            void api('/me/entries', { method: 'POST', body: JSON.stringify(form) })
              .then(() => {
                target.reset()
                toast.show('سابقه اضافه شد', 'success')
                return refresh()
              })
              .catch((reason) => setError(errText(reason)))
              .finally(() => setAddingEntry(false))
          }}
        >
          <h2 className="section-title section-title--tight">افزودن سابقه و دستاورد</h2>
          <select className="select" name="kind" defaultValue="experience">
            <option value="education">تحصیل</option>
            <option value="experience">شغل</option>
            <option value="publication">مقاله</option>
            <option value="certificate">دوره</option>
            <option value="talk">سخنرانی</option>
            <option value="skill">مهارت</option>
          </select>
          <input className="input" name="title" placeholder="عنوان" required />
          <div className="two">
            <input className="input" name="subtitle" placeholder="محل یا ناشر" />
            <input className="input" name="year" placeholder="سال" />
          </div>
          <Button variant="ghost" block loading={addingEntry} type="submit">افزودن سابقه</Button>
        </form>

        {(user.entries?.length ?? 0) > 0 && (
          <div className="stack">
            <h2 className="section-title section-title--tight">سوابق ثبت‌شده</h2>
            {user.entries?.map((entry) => (
              <div key={entry.id} className="card row between" style={{ alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="muted" style={{ fontSize: 11 }}>{entryLabels[entry.kind] || entry.kind}</div>
                  <b>{entry.title}</b>
                  {(entry.subtitle || entry.year) && (
                    <div className="muted" style={{ fontSize: 12 }}>{[entry.subtitle, entry.year].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="حذف سابقه"
                  onClick={() => void api(`/me/entries/${entry.id}`, { method: 'DELETE' })
                    .then(() => {
                      toast.show('سابقه حذف شد', 'info')
                      return refresh()
                    })
                    .catch((reason) => setError(errText(reason)))}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const exploreKey = 'tebyar-explore'

type ExploreFeedResponse = {
  data: Post[]
  next_page: string | null
  tags?: string[]
  suggested?: UserCard[]
}

export function Explore() {
  const navigate = useNavigate()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [doctors, setDoctors] = useState<UserCard[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [suggested, setSuggested] = useState<UserCard[]>([])
  const [posts, setPosts] = useState<Post[]>(() => readCache<Post[]>(exploreKey) ?? [])
  const [loading, setLoading] = useState(() => readCache<Post[]>(exploreKey) == null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = q.trim()
    if (trimmed.length >= 2) {
      setLoading(true)
      setHasMore(false)
      const timer = window.setTimeout(() => {
        void api<{ doctors: UserCard[]; posts: Post[]; hashtags?: string[] }>(`/explore?q=${encodeURIComponent(trimmed)}`).then((payload) => {
          setDoctors(payload.doctors)
          setTags(payload.hashtags ?? [])
          setSuggested([])
          setPosts(payload.posts)
          setLoading(false)
        }).catch(() => setLoading(false))
      }, 250)
      return () => window.clearTimeout(timer)
    }

    if (!selectedTag) {
      const cached = readCache<Post[]>(exploreKey)
      if (cached) {
        setPosts(cached)
        setLoading(false)
      } else {
        setLoading(true)
      }
    } else {
      setLoading(true)
    }

    setDoctors([])
    setPage(1)
    const qs = selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : ''
    let cancelled = false
    void api<ExploreFeedResponse>(`/explore${qs}`).then((payload) => {
      if (cancelled) return
      setPosts(payload.data)
      if (payload.tags) setTags(payload.tags)
      if (payload.suggested) setSuggested(payload.suggested)
      setHasMore(Boolean(payload.next_page))
      if (!selectedTag) writeCache(exploreKey, payload.data)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [q, selectedTag])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loadingMore || q.trim().length >= 2) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      const nextPage = page + 1
      setLoadingMore(true)
      const params = new URLSearchParams({ page: String(nextPage) })
      if (selectedTag) params.set('tag', selectedTag)
      void api<ExploreFeedResponse>(`/explore?${params}`)
        .then((payload) => {
          setPosts((current) => {
            const seen = new Set(current.map((item) => item.id))
            const fresh = payload.data.filter((item) => !seen.has(item.id))
            return [...current, ...fresh]
          })
          setPage(nextPage)
          setHasMore(Boolean(payload.next_page))
        })
        .catch(() => setHasMore(false))
        .finally(() => setLoadingMore(false))
    }, { rootMargin: '220px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, page, q, selectedTag])

  const toggleFollow = (doctor: UserCard) => {
    if (!doctor.id) return
    const next = !doctor.is_following
    setSuggested((rows) => rows.map((row) => (row.id === doctor.id ? { ...row, is_following: next } : row)))
    void api(`/doctors/${doctor.id}/follow`, { method: next ? 'POST' : 'DELETE' })
      .then(() => toast.show(next ? 'دنبال شد' : 'دنبال‌کردن لغو شد', 'info'))
      .catch((reason) => {
        setSuggested((rows) => rows.map((row) => (row.id === doctor.id ? { ...row, is_following: !next } : row)))
        toast.show(errText(reason), 'error')
      })
  }

  return (
    <>
      <Top title="اکسپلور" back />
      <div className="screen-body search-screen explore-screen">
        <div className="pad">
          <div className="explore-search-pill">
            <Icon name="search" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="جست‌وجوی نام پزشک، پست یا #هشتگ..."
              aria-label="جست‌وجو در اکسپلور"
            />
            {q && (
              <button type="button" className="text-btn" style={{ padding: 4 }} aria-label="پاک‌کردن" onClick={() => setQ('')}>
                <Icon name="close" />
              </button>
            )}
          </div>

          {!q.trim() && tags.length > 0 && (
            <div className="explore-tags">
              <button
                className={selectedTag === '' ? 'chip is-on' : 'chip chip-blue'}
                type="button"
                onClick={() => setSelectedTag('')}
              >
                برای شما
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  className={selectedTag === tag ? 'chip is-on' : 'chip chip-blue'}
                  type="button"
                  onClick={() => setSelectedTag((cur) => (cur === tag ? '' : tag))}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {q.trim().length >= 2 && tags.length > 0 && (
            <div className="explore-tags">
              {tags.map((tag) => (
                <button key={tag} className="chip chip-blue" type="button" onClick={() => { setQ(''); setSelectedTag(tag) }}>
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {!q.trim() && !selectedTag && suggested.length > 0 && (
            <div className="explore-suggest" aria-label="همکاران پیشنهادی">
              {suggested.map((doctor) => (
                <div key={doctor.id} className="explore-suggest-card">
                  <button
                    type="button"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: '100%' }}
                    onClick={() => doctor.slug && navigate(`/doctors/${doctor.slug}`)}
                  >
                    <Avatar user={doctor} />
                    <b>{doctor.name}</b>
                    <span className="sub">{doctor.specialty_title || doctor.role_label}</span>
                  </button>
                  <Button
                    size="sm"
                    variant={doctor.is_following ? 'ghost' : 'primary'}
                    block
                    type="button"
                    onClick={() => toggleFollow(doctor)}
                  >
                    {doctor.is_following ? 'دنبال می‌کنید' : 'دنبال کردن'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {loading && posts.length === 0 && doctors.length === 0 && <ListSkel rows={5} />}
          {doctors.length > 0 && (
            <div className="card" style={{ padding: '4px 10px', marginBottom: 12 }}>
              {doctors.map((doctor) => (
                <button key={doctor.id} className="list-row" type="button" onClick={() => doctor.slug && navigate(`/doctors/${doctor.slug}`)}>
                  <Avatar user={doctor} />
                  <div className="body">
                    <div className="title">{doctor.name} <VerifiedSeal user={doctor} /></div>
                    <div className="sub">{doctor.specialty_title || doctor.role_label}{doctor.city ? ` · ${doctor.city}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && posts.length === 0 && doctors.length === 0 && (
            q.trim().length >= 2
              ? <Empty icon="search" title="نتیجه‌ای نیست" text="نام، متن پست یا هشتگ دیگری را امتحان کنید." />
              : <Empty icon="explore" title="پستی نیست" text="اولین پست‌ها به‌زودی اینجا ظاهر می‌شوند." />
          )}
        </div>
        <PostGrid
          posts={posts}
          variant="explore"
          impressionSource="explore"
          onOpen={(_, index) => setViewerIndex(index)}
        />
        <div ref={sentinelRef} style={{ height: 24 }} aria-hidden="true" />
        {loadingMore && <p className="muted center" style={{ fontSize: 12, paddingBottom: 16 }}>در حال بارگذاری بیشتر...</p>}
      </div>
      {viewerIndex != null && posts.length > 0 && (
        <PostViewer posts={posts} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </>
  )
}
