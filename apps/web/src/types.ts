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
  anonymous: boolean
  entries?: Entry[]
}

export type Me = UserCard & {
  phone: string | null
  account_status: string
  status_label: string
  staff_role: string | null
  privacy_dm: string
  notify_interactions: boolean
  notify_messages: boolean
  can_create_case: boolean
  can_create_poll: boolean
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
  body: string
  created_at: string | null
  author: UserCard
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
