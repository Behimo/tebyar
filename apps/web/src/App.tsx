import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { Skel } from './ui'
import { Icon } from './icons'
import {
  Apply, Employer, Jobs, JobPage, Join, Login, Notifications, Otp, Pending, Settings,
} from './screens/account'
import { CasePage, Communities, CommunityPage, Compose, Home, PollPage, PostPage, TopicPage } from './screens/social'
import { Chat, DoctorPage, EditProfile, Messages, Profile, Search } from './screens/talk'

function Guest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Skel />
  if (!user) return children
  if (user.account_status !== 'verified') return <Navigate to={user.role ? '/pending' : '/join'} replace />
  return <Navigate to={user.role === 'employer' ? '/employer' : '/'} replace />
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Skel />
  if (!user) return <Navigate to="/login" replace />
  if (user.account_status !== 'verified') {
    const allowed = location.pathname === '/join' || location.pathname === '/pending'
    if (!allowed) return <Navigate to={user.role ? '/pending' : '/join'} replace />
  } else if (user.role === 'employer' && location.pathname !== '/employer') {
    return <Navigate to="/employer" replace />
  }
  return <Outlet />
}

function Shell() {
  const location = useLocation()
  const { user } = useAuth()
  const [sheet, setSheet] = useState(false)
  const tabs = user?.account_status === 'verified' && user.role !== 'employer' && ['/', '/communities', '/messages', '/profile'].includes(location.pathname)

  const showTabs = tabs || location.pathname === '/compose' || location.pathname === '/case' || location.pathname === '/poll'
  return (
    <div className="app-root">
      <div className="app-column">
        <div className="screen is-active">
          <Outlet />
        </div>
        {showTabs && (
          <nav className="tabbar">
            <Tab to="/" icon="home" label="خانه" />
            <Tab to="/communities" icon="users" label="انجمن" />
            <button className="tab tab-create" type="button" onClick={() => setSheet(true)}>
              <span className="create-btn"><Icon name="plus" />انتشار</span>
            </button>
            <Tab to="/messages" icon="chat" label="پیام‌ها" />
            <Tab to="/profile" icon="user" label="پروفایل" />
          </nav>
        )}
        {sheet && (
          <div className="overlay is-open" onClick={() => setSheet(false)}>
            <div className="sheet" onClick={(event) => event.stopPropagation()}>
              <h2>انتشار</h2>
              <Link className="sheet-item" to="/compose" onClick={() => setSheet(false)}>پست اجتماعی</Link>
              {user?.can_create_case && <Link className="sheet-item" to="/case" onClick={() => setSheet(false)}>طرح کیس ناشناس</Link>}
              {user?.can_create_poll && <Link className="sheet-item" to="/poll" onClick={() => setSheet(false)}>نظرسنجی تخصصی</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Tab({ to, icon, label }: { to: string; icon: string; label: string }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link to={to} className={active ? 'tab is-active' : 'tab'}>
      <Icon name={icon} />
      {label}
    </Link>
  )
}

export default function App() {
  return (
    <Routes>
        <Route element={<Shell />}>
          <Route path="/login" element={<Guest><Login /></Guest>} />
          <Route path="/otp" element={<Guest><Otp /></Guest>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/join" element={<Join />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/posts/:id" element={<PostPage />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/communities/:slug" element={<CommunityPage />} />
            <Route path="/topics/:id" element={<TopicPage />} />
            <Route path="/case" element={<CasePage />} />
            <Route path="/poll" element={<PollPage />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/doctors/:slug" element={<DoctorPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobPage />} />
            <Route path="/jobs/:id/apply" element={<Apply />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/employer" element={<Employer />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}
