import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import styles from './LoginPage.module.css'

export default function LoginPage({ onSuccess, onBack }) {
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
      await login(loginVal, password)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <button className={styles.back} onClick={onBack}>← Назад</button>
        <h2 className={styles.title}>Вход</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
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

        <div className={styles.divider} />

        <button className={styles.registerBtn} onClick={() => navigate('/sign-up')}>
          Зарегистрироваться
        </button>
      </div>
    </main>
  )
}