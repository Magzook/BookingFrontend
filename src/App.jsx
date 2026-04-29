import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { getProfile } from './api/client'

import AdminPage from './pages/AdminPage'
import MyBookingsPage from './pages/MyBookingsPage'
import BookingSuccessPage from './pages/BookingSuccessPage'
import ResourcePage from './pages/ResourcePage'
import ProfilePage from './pages/ProfilePage'

function AppInner() {
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getProfile().then(setProfile)
  }, [])

  function handleLoginSuccess() {
    getProfile().then(p => {
      setProfile(p)
      navigate('/')
    })
  }

  function handleLogout() {
    setProfile(null)
    navigate('/')
  }

  return (
    <>
      <Navbar profile={profile} onLogout={handleLogout} />
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/resources"      element={<CatalogPage />} />
        <Route path="/resources/:id"  element={<ResourcePage />} />
        <Route path="/sign-in"   element={
          <LoginPage
            onSuccess={handleLoginSuccess}
            onBack={() => navigate(-1)}
          />
        } />
        <Route path="/admin"         element={<AdminPage />} />
        <Route path="/my-bookings"   element={<MyBookingsPage />} />
        <Route path="/booking-success" element={<BookingSuccessPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/sign-up"   element={
          <RegisterPage
            onSuccess={handleLoginSuccess}
            onBack={() => navigate('/sign-in')}
          />
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