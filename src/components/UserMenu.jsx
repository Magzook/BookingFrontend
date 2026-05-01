import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/client'
import styles from './UserMenu.module.css'

export default function UserMenu({ profile, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await logout()
    onLogout()
  }

  const displayName = profile.name || profile.login
  const isHostess   = profile.role === 'hostess' || profile.role === 'admin'
  const isAdmin     = profile.role === 'admin'

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(o => !o)}>
        <span className={styles.avatar}>{displayName[0].toUpperCase()}</span>
        <span className={styles.name}>{displayName}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronUp : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <button className={styles.item} onClick={() => { setOpen(false); navigate('/profile') }}>
            Мой профиль
          </button>
          <button className={styles.item} onClick={() => { setOpen(false); navigate('/my-bookings') }}>
            Мои брони
          </button>
          <div className={styles.sep} />
          {isHostess && (
            <button className={styles.item} onClick={() => { setOpen(false); navigate('/hostess') }}>Панель хостеса</button>
          )}
          {isAdmin && (
            <button className={styles.item} onClick={() => { setOpen(false); navigate('/admin') }}>Панель администратора</button>
          )}
          {(isHostess || isAdmin) && <div className={styles.sep} />}
          <button className={`${styles.item} ${styles.logout}`} onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}