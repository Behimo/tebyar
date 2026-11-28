export type Badges = {
  education: boolean
  identity: boolean
  license: boolean
  specialty: boolean
}

export type Entry = {
  id: number
  kind: string
  title: string
  subtitle: string | null
  body: string | null
  year: string | null
}

export type QuotaKey = 'posts' | 'stories' | 'topics' | 'comments' | 'conversations'

export type QuotaItem = {
  key: QuotaKey
  label: string
  used: number
  limit: number | null
  remaining: number | null
  exceeded: boolean
}

export type QuotaState = {
  limits_enabled: boolean
  is_exempt: boolean
  period?: 'daily' | 'lifetime'
  items: Partial<Record<QuotaKey, QuotaItem>>
}

export type Permissions = {
  post: boolean
  story: boolean
  ask: boolean
  discussion: boolean
  case: boolean
  poll: boolean
  message: boolean
  jobs: boolean
  subscribe: boolean
  insights: boolean
  audience: boolean
}

export type AudienceGroup = {
  key: string
  label: string
}

export type UserCard = {
  id: number | null
  name: string
  slug: string | null
  role: string | null
  role_label: string
  specialty_title: string | null
  headline: string | null
  bio: string | null
  city: string | null
  avatar_url: string | null
  badges: Badges
  followers_count: number
  following_count: number
  posts_count: number
  is_following: boolean
  is_self: boolean
  is_demo: boolean
  is_pro?: boolean
  open_to_work?: boolean
  anonymous: boolean
  entries?: Entry[]
}

export type Me = UserCard & {
  phone: string | null
  account_status: string
  status_label: string
  staff_role: string | null
  privacy_dm: string
  privacy_mentions: string
  show_read_receipts: boolean
  open_to_work: boolean
  notify_interactions: boolean
  notify_messages: boolean
  can_create_case: boolean
  can_create_poll: boolean
  tier?: 'professional' | 'restricted' | null
  permissions?: Permissions
  audience_groups?: AudienceGroup[]
  is_pro: boolean
  pro_until: string | null
  quotas?: QuotaState
  verification: { type: string; status: string; note: string | null } | null
  organization: {
    id: number
    name: string
    type: string
    type_label: string
    city: string
    about: string | null
    status: string
  } | null
}

export type Post = {
  id: number
  type: string
  body: string | null
  link_url: string | null
  link_title: string | null
  hashtags: string[]
  media: { url: string; kind: string }[]
  reactions_count: number
  comments_count: number
  reposts_count: number
  reacted: boolean
  bookmarked: boolean
  is_demo: boolean
  audience?: string[] | null
  audience_labels?: string[]
  created_at: string | null
  author: UserCard
  repost_of: Post | null
  comments?: Comment[]
}

export type Comment = {
  id: number
  body: string
  created_at: string | null
  author: UserCard
  replies?: { id: number; body: string; created_at: string | null; author: UserCard }[]
}

export type Story = {
  id: number
  media_url: string
  expires_at: string
  seen: boolean
  mine: boolean
  author: UserCard
}

export type Topic = {
  id: number
  kind: string
  title: string
  body: string | null
  anonymous: boolean
  audience?: string[] | null
  audience_labels?: string[]
  is_demo: boolean
  created_at: string | null
  author: UserCard
  reply_count?: number
  disclaimer: string | null
  community: { slug: string; name: string }
  poll: {
    total: number
    voted_option_id: number | null
    options: { id: number; label: string; votes: number; percent: number }[]
  } | null
}

export type Reply = {
  id: number
  parent_id?: number | null
  body: string
  created_at: string | null
  author: UserCard
  replies?: Reply[]
}

export type Conversation = {
  id: number
  type: 'direct' | 'group'
  title?: string | null
  peer: UserCard
  members?: UserCard[]
  am_admin?: boolean
  unread: boolean
  last_message: { body: string; created_at: string | null; mine: boolean } | null
}

export type ChatMessage = {
  id: number
  body: string | null
  sender_id?: number
  sender_name?: string | null
  attachment_url: string | null
  attachment_name: string | null
  mine: boolean
  read: boolean
  created_at: string | null
}

export type Vacancy = {
  id: number
  title: string
  specialty: string
  city: string
  employment_type: string
  employment_label: string
  description: string
  created_at: string | null
  saved: boolean
  applied: boolean
  applications_count?: number
  organization: { name: string; type: string; type_label: string; city: string; about: string | null }
}

export type Notice = {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read_at: string | null
  created_at: string | null
}

export type CommunityCard = {
  id: number
  name: string
  slug: string
  specialty: string
  description: string
  members_count: number
  topics_count: number
  following: boolean
}

export type ProPlan = {
  slug: string
  title: string
  months: number
  amount: number
}

export type SubscriptionRequest = {
  id: number
  plan: string
  months: number
  amount: number
  status: string
  status_label: string
  reference: string | null
  note: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string | null
}

export type SubscriptionOverview = {
  is_pro: boolean
  pro_until: string | null
  plans: ProPlan[]
  payment_note: string
  pending: SubscriptionRequest | null
  history: SubscriptionRequest[]
  quotas: QuotaState
}

export type MetricValue = {
  value: number
  previous: number
  delta_pct: number | null
}

export type InsightsSeriesPoint = {
  date: string
  impressions: number
  reach: number
  engagements: number
  followers: number
  profile_views: number
}

export type InsightsOverview = {
  range: 7 | 30 | 90
  is_pro: boolean
  summary: {
    reach: MetricValue
    impressions: MetricValue
    engaged_accounts: MetricValue
    engagements_total: MetricValue
    followers_total: number
    followers_new: MetricValue
    profile_views: MetricValue
    content_count: number
  }
  breakdown: {
    likes: number
    comments: number
    bookmarks: number
    reposts: number
    topic_replies: number
    poll_votes: number
    story_views: number
  }
  series: InsightsSeriesPoint[]
  top_posts: {
    id: number
    excerpt: string
    cover_url: string | null
    created_at: string | null
    impressions: number
    reach: number
    engagements: number
  }[] | null
  audience: {
    total_followers: number
    roles: { label: string; count: number; percent: number }[]
    specialties: { label: string; count: number; percent: number }[]
    cities: { label: string; count: number; percent: number }[]
  } | null
}

export type PostInsights = {
  post: {
    id: number
    excerpt: string
    cover_url: string | null
    created_at: string | null
  }
  summary: {
    impressions: number
    reach: number
    engagements: number
    engagement_rate: number
    likes: number
    comments: number
    bookmarks: number
    reposts: number
  }
  sources: { source: string; label: string; count: number; percent: number }[]
  roles: { label: string; count: number; percent: number }[]
  series: { date: string; impressions: number; reach: number }[]
}
