import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from './auth'
import { Skel } from './ui'
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

  return (
    <div className="device">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="screen"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 14 }}
          transition={{ duration: 0.28, ease: [0.22, 0.8, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      {tabs && (
        <nav className="tabbar">
          <Tab to="/" label="خانه" />
          <Tab to="/communities" label="انجمن" />
          <button type="button" onClick={() => setSheet(true)}>
            <span className="create-fab">+</span>
            انتشار
          </button>
          <Tab to="/messages" label="پیام‌ها" />
          <Tab to="/profile" label="پروفایل" />
        </nav>
      )}
      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="handle" />
            <Link className="choice" to="/compose" onClick={() => setSheet(false)}>پست اجتماعی</Link>
            {user?.can_create_case && <Link className="choice" to="/case" onClick={() => setSheet(false)}>طرح کیس ناشناس</Link>}
            {user?.can_create_poll && <Link className="choice" to="/poll" onClick={() => setSheet(false)}>نظرسنجی تخصصی</Link>}
          </div>
        </div>
      )}
    </div>
  )
}

function Tab({ to, label }: { to: string; label: string }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link to={to} className={active ? 'active' : ''}>
      {active && <motion.span className="pill" layoutId="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
      <span>{label}</span>
    </Link>
  )
}

export default function App() {
  return (
    <div className="stage">
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
    </div>
  )
}
