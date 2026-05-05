import { useState } from 'react'
import { signUp, confirmSignUp } from '../api/client'
import styles from './RegisterPage.module.css'

const STATUS_MESSAGES = {
  '-1': 'Email имеет неверный формат',
  '-2': 'Пароль должен содержать не менее 8 символов',
  '-3': 'Фамилия, имя, дата рождения и номер документа обязательны',
  '-4': 'Этот email уже используется',
}

const CONFIRM_MESSAGES = {
  '-1': 'Время действия кода истекло. Зарегистрируйтесь заново.',
  '-2': 'Неверный код подтверждения.',
}

export default function RegisterPage({ onSuccess, onBack }) {
  const [step, setStep]                     = useState('form')
  const [registrationId, setRegistrationId] = useState(null)

  // form fields
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [password2, setPassword2]       = useState('')
  const [lastName, setLastName]         = useState('')
  const [firstName, setFirstName]       = useState('')
  const [middleName, setMiddleName]     = useState('')
  const [birthDate, setBirthDate]       = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [formError, setFormError]       = useState(null)
  const [formLoading, setFormLoading]   = useState(false)

  // confirm fields
  const [code, setCode]                 = useState('')
  const [confirmError, setConfirmError] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  async function handleSubmitForm(e) {
    e.preventDefault()
    setFormError(null)

    if (password !== password2) {
      setFormError('Пароли не совпадают')
      return
    }

    setFormLoading(true)
    try {
      const { registrationId } = await signUp({
        email,
        password,
        lastName,
        firstName,
        middleName,
        birthDate,
        documentNumber,
      })
      setRegistrationId(registrationId)
      setStep('confirm')
    } catch (err) {
      setFormError(STATUS_MESSAGES[String(err.status)] ?? err.msg ?? 'Что-то пошло не так')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleSubmitConfirm(e) {
    e.preventDefault()
    setConfirmError(null)
    setConfirmLoading(true)
    try {
      await confirmSignUp(registrationId, code)
      onSuccess()
    } catch (err) {
      if (err.status === -1) {
        setStep('form')
        setFormError('Время действия кода истекло. Отправьте данные повторно.')
      } else {
        setConfirmError(CONFIRM_MESSAGES[String(err.status)] ?? err.msg)
      }
    } finally {
      setConfirmLoading(false)
    }
  }

  if (step === 'confirm') {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <button className={styles.back} onClick={() => setStep('form')}>← Назад</button>
          <h2 className={styles.title}>Подтверждение</h2>
          <p className={styles.hint}>
            Мы отправили 6-значный код на <strong>{email}</strong>.<br />
            Введите его ниже. Код действует 2 минуты.
          </p>

          <form onSubmit={handleSubmitConfirm} className={styles.form}>
            <label className={styles.label}>
              Код подтверждения
              <input
                className={`${styles.input} ${styles.codeInput}`}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
            </label>

            {confirmError && <p className={styles.error}>{confirmError}</p>}

            <button className={styles.submitBtn} disabled={confirmLoading || code.length < 6}>
              {confirmLoading ? 'Проверяем…' : 'Подтвердить'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <button className={styles.back} onClick={onBack}>← Назад</button>
        <h2 className={styles.title}>Регистрация</h2>

        <form onSubmit={handleSubmitForm} className={styles.form}>
          <label className={styles.label}>
            Фамилия
            <input
              className={styles.input}
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label className={styles.label}>
            Имя
            <input
              className={styles.input}
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Отчество
            <input
              className={styles.input}
              type="text"
              value={middleName}
              onChange={e => setMiddleName(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Дата рождения
            <input
              className={styles.input}
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Номер документа
            <input
              className={styles.input}
              type="text"
              value={documentNumber}
              onChange={e => setDocumentNumber(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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

          <label className={styles.label}>
            Повторите пароль
            <input
              className={styles.input}
              type="password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              required
            />
          </label>

          {formError && <p className={styles.error}>{formError}</p>}

          <button className={styles.submitBtn} disabled={formLoading}>
            {formLoading ? 'Отправляем…' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={styles.divider} />

        <p className={styles.loginHint}>
          Уже есть аккаунт?{' '}
          <button className={styles.loginLink} onClick={onBack}>Войти</button>
        </p>
      </div>
    </main>
  )
}