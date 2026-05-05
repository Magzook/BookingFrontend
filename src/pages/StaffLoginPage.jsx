import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAsStaff } from '../api/client'
import styles from './LoginPage.module.css'

export default function StaffLoginPage({ onSuccess }) {
  const [role, setRole]         = useState('hostess')
  const [loginVal, setLoginVal] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginAsStaff(loginVal, password, role)
      onSuccess(loginVal, role)
    } catch (err) {
      if (err?.status === -1) {
        setError('Неверный логин или пароль')
      } else {
        setError(err?.msg ?? 'Что-то пошло не так')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <button className={styles.back} onClick={() => navigate('/sign-in')}>← Назад</button>
        <h2 className={styles.title}>Вход для персонала</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="role"
                value="hostess"
                checked={role === 'hostess'}
                onChange={() => setRole('hostess')}
              />
              Хостес
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === 'admin'}
                onChange={() => setRole('admin')}
              />
              Администратор
            </label>
          </div>

          <label className={styles.label}>
            Логин
            <input
              className={styles.input}
              type="text"
              value={loginVal}
              onChange={e => setLoginVal(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label className={styles.label}>
            Пароль
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} disabled={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>
      </div>
    </main>
  )
}