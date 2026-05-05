import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import LoginPage from './pages/LoginPage'
import StaffLoginPage from './pages/StaffLoginPage'
import RegisterPage from './pages/RegisterPage'
import { getGuestProfile, makeStaffProfile } from './api/client'
import ProtectedRoute from './components/ProtectedRoute'

import AdminPage from './pages/AdminPage'
import HostessPage from './pages/HostessPage'
import MyBookingsPage from './pages/MyBookingsPage'
import BookingSuccessPage from './pages/BookingSuccessPage'
import ResourcePage from './pages/ResourcePage'
import ProfilePage from './pages/ProfilePage'

function AppInner() {
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  // On mount: try to restore a guest session (staff have no session-check endpoint)
  useEffect(() => {
    getGuestProfile().then(setProfile)
  }, [])

  async function handleLoginSuccess() {
    const p = await getGuestProfile()
    setProfile(p)
    navigate('/')
  }

  function handleStaffLoginSuccess(login, role) {
    setProfile(makeStaffProfile(login, role))
    if (role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/hostess')
    }
  }

  function handleLogout() {
    setProfile(null)
    navigate('/')
  }

  return (
    <>
      <Navbar profile={profile} onLogout={handleLogout} />
      <Routes>
        <Route path="/"           element={<HomePage />} />
        <Route path="/resources"      element={<CatalogPage />} />
        <Route path="/resources/:id"  element={<ResourcePage />} />

        {/* Guest login */}
        <Route path="/sign-in" element={
          <LoginPage
            onSuccess={handleLoginSuccess}
            onBack={() => navigate(-1)}
          />
        } />

        {/* Staff login (hostess / admin) */}
        <Route path="/sign-in-as-staff" element={
          <StaffLoginPage onSuccess={handleStaffLoginSuccess} />
        } />

        <Route path="/sign-up" element={
          <RegisterPage
            onSuccess={handleLoginSuccess}
            onBack={() => navigate('/sign-in')}
          />
        } />

        <Route path="/admin" element={
          <ProtectedRoute profile={profile} allowedRoles={['admin']}>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/hostess" element={
          <ProtectedRoute profile={profile} allowedRoles={['hostess']}>
            <HostessPage />
          </ProtectedRoute>
        } />
        <Route path="/my-bookings"     element={<MyBookingsPage />} />
        <Route path="/booking-success" element={<BookingSuccessPage />} />
        <Route path="/profile" element={
          <ProtectedRoute profile={profile} allowedRoles={['guest']}>
            <ProfilePage />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}