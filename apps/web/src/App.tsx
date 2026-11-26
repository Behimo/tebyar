import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from './auth'
import { Sheet, Skel } from './ui'
import { Icon } from './icons'
import {
  Apply, Bookmarks, Employer, Jobs, JobPage, Join, Login, Notifications, Otp, Pending, Settings,
} from './screens/account'
import { CasePage, Communities, CommunityPage, Compose, Home, PollPage, PostPage, TopicPage } from './screens/social'
import { Chat, DoctorPage, EditProfile, Explore, Messages, Profile } from './screens/talk'

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
  const navType = useNavigationType()
  const { user } = useAuth()
  const [sheet, setSheet] = useState(false)
  const tabs = user?.account_status === 'verified' && user.role !== 'employer' && ['/', '/communities', '/jobs', '/profile'].includes(location.pathname)
  const showTabs = tabs || location.pathname === '/compose' || location.pathname === '/case' || location.pathname === '/poll'
  const offset = navType === 'POP' ? 14 : -14

  return (
    <div className="app-root">
      <div className="app-column">
        <motion.div
          key={location.pathname}
          className="screen is-active"
          data-tabbar={showTabs ? 'on' : 'off'}
          initial={{ opacity: 0, x: offset }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        >
          <Outlet />
        </motion.div>

        {showTabs && (
          <nav className="tabbar">
            <Tab to="/" icon="home" label="خانه" />
            <Tab to="/communities" icon="users" label="انجمن" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="tab tab-create"
              type="button"
              onClick={() => setSheet(true)}
            >
              <span className="create-btn"><Icon name="plus" />انتشار</span>
            </motion.button>
            <Tab to="/jobs" icon="briefcase" label="فرصت‌ها" />
            <Tab to="/profile" icon="user" label="پروفایل" />
          </nav>
        )}

        <Sheet open={sheet} onClose={() => setSheet(false)}>
          <h2>انتشار محتوای جدید</h2>
          <Link className="sheet-item" to="/compose" onClick={() => setSheet(false)}>
            <Icon name="edit" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>پست اجتماعی</div>
              <div className="muted" style={{ fontSize: 12 }}>متن، تصویر، تجربه روزمره یا لینک مقاله</div>
            </div>
          </Link>
          {user?.can_create_case && (
            <Link className="sheet-item" to="/case" onClick={() => setSheet(false)}>
              <Icon name="book" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>طرح کیس ناشناس</div>
                <div className="muted" style={{ fontSize: 12 }}>مشورت همکاران بدون افشای مشخصات بیمار</div>
              </div>
            </Link>
          )}
          {user?.can_create_poll && (
            <Link className="sheet-item" to="/poll" onClick={() => setSheet(false)}>
              <Icon name="chart" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>نظرسنجی تخصصی</div>
                <div className="muted" style={{ fontSize: 12 }}>سنجش دیدگاه پزشکان در انجمن</div>
              </div>
            </Link>
          )}
        </Sheet>
      </div>
    </div>
  )
}

function Tab({ to, icon, label }: { to: string; icon: string; label: string }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link to={to} className={active ? 'tab is-active' : 'tab'}>
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="tab-active-pill"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <Icon name={icon} />
      <span>{label}</span>
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
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Navigate to="/explore" replace />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobPage />} />
          <Route path="/jobs/:id/apply" element={<Apply />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/employer" element={<Employer />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
