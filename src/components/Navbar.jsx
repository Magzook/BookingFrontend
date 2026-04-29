import { NavLink, useNavigate } from 'react-router-dom'
import UserMenu from './UserMenu'
import styles from './Navbar.module.css'

export default function Navbar({ profile, onLogout }) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.logo}>
          <span className={styles.logoIcon}>☽</span>
          <span className={styles.logoText}>Парная</span>
        </NavLink>

        <nav className={styles.tabs}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            Главная
          </NavLink>
          <NavLink
            to="/resources"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            Каталог
          </NavLink>
        </nav>

        {profile
          ? <UserMenu profile={profile} onLogout={onLogout} />
          : <button className={styles.loginBtn} onClick={() => navigate('/sign-in')}>Войти</button>
        }
      </div>
    </header>
  )
}