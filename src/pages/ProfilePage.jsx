import { useState, useEffect } from 'react'
import { getProfile, updatePersonal, updatePassword, updateEmail, confirmEmailChange } from '../api/client'
import styles from './ProfilePage.module.css'

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

function FieldRow({ label, value, onEdit }) {
  return (
    <div className={styles.fieldRow}>
      <div>
        <p className={styles.fieldLabel}>{label}</p>
        <p className={styles.fieldValue}>{value || <span className={styles.empty}>не указано</span>}</p>
      </div>
      <button className={styles.editBtn} onClick={onEdit}>Изменить</button>
    </div>
  )
}

function StatusMsg({ ok, msg }) {
  if (!msg) return null
  return <p className={ok ? styles.success : styles.error}>{msg}</p>
}

function PersonalSection({ current, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [lastName,       setLastName]       = useState('')
  const [firstName,      setFirstName]      = useState('')
  const [middleName,     setMiddleName]     = useState('')
  const [birthDate,      setBirthDate]      = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)
  const [ok, setOk]           = useState(false)

  const ERRORS = {
    '-1': 'Фамилия, имя, дата рождения и номер документа не могут быть пустыми',
  }

  function openEdit() {
    setLastName(current.lastName ?? '')
    setFirstName(current.firstName ?? '')
    setMiddleName(current.middleName ?? '')
    setBirthDate(current.birthDate ?? '')
    setDocumentNumber(current.documentNumber ?? '')
    setMsg(null)
    setEditing(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      await updatePersonal({
        newLastName:       lastName       !== current.lastName       ? lastName       : undefined,
        newFirstName:      firstName      !== current.firstName      ? firstName      : undefined,
        newMiddleName:     middleName     !== current.middleName     ? middleName     : undefined,
        newBirthDate:      birthDate      !== current.birthDate      ? birthDate      : undefined,
        newDocumentNumber: documentNumber !== current.documentNumber ? documentNumber : undefined,
      })
      setOk(true)
      setMsg('Персональные данные сохранены')
      setEditing(false)
      onUpdated()
    } catch (err) {
      setOk(false)
      setMsg(ERRORS[String(err.status)] ?? err.msg)
    } finally {
      setLoading(false)
    }
  }

  const fullName = [current.lastName, current.firstName, current.middleName].filter(Boolean).join(' ')

  return (
    <Section title="Персональные данные">
      {!editing ? (
        <>
          <div className={styles.personalFields}>
            <div className={styles.personalField}>
              <p className={styles.fieldLabel}>ФИО</p>
              <p className={styles.fieldValue}>{fullName || <span className={styles.empty}>не указано</span>}</p>
            </div>
            <div className={styles.personalField}>
              <p className={styles.fieldLabel}>Дата рождения</p>
              <p className={styles.fieldValue}>{current.birthDate || <span className={styles.empty}>не указано</span>}</p>
            </div>
            <div className={styles.personalField}>
              <p className={styles.fieldLabel}>Номер документа</p>
              <p className={styles.fieldValue}>{current.documentNumber || <span className={styles.empty}>не указано</span>}</p>
            </div>
          </div>
          <button className={styles.editBtn} onClick={openEdit}>Изменить</button>
          <StatusMsg ok={ok} msg={msg} />
        </>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>Фамилия
            <input className={styles.input} value={lastName} onChange={e => setLastName(e.target.value)}
              autoFocus placeholder="Фамилия" required />
          </label>
          <label className={styles.label}>Имя
            <input className={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Имя" required />
          </label>
          <label className={styles.label}>Отчество
            <input className={styles.input} value={middleName} onChange={e => setMiddleName(e.target.value)}
              placeholder="Отчество (необязательно)" />
          </label>
          <label className={styles.label}>Дата рождения
            <input className={styles.input} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
              required />
          </label>
          <label className={styles.label}>Номер документа
            <input className={styles.input} value={documentNumber} onChange={e => setDocumentNumber(e.target.value)}
              placeholder="Номер документа" required />
          </label>
          <StatusMsg ok={ok} msg={msg} />
          <div className={styles.formBtns}>
            <button className={styles.saveBtn} disabled={loading}>{loading ? 'Сохраняем…' : 'Сохранить'}</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </form>
      )}
    </Section>
  )
}

function PasswordSection() {
  const [editing, setEditing]   = useState(false)
  const [oldPass, setOldPass]   = useState('')
  const [newPass, setNewPass]   = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState(null)
  const [ok, setOk]             = useState(false)
  const ERRORS = { '-1': 'Старый пароль неверный', '-2': 'Пароль должен содержать не менее 8 символов' }

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPass !== newPass2) { setOk(false); setMsg('Пароли не совпадают'); return }
    setLoading(true); setMsg(null)
    try {
      await updatePassword(oldPass, newPass); setOk(true); setMsg('Пароль изменён')
      setEditing(false); setOldPass(''); setNewPass(''); setNewPass2('')
    } catch (err) { setOk(false); setMsg(ERRORS[String(err.status)] ?? err.msg) }
    finally { setLoading(false) }
  }

  return (
    <Section title="Пароль">
      {!editing
        ? <div className={styles.fieldRow}>
            <div>
              <p className={styles.fieldLabel}>Пароль</p>
              <p className={styles.fieldValue}>••••••••</p>
            </div>
            <button className={styles.editBtn} onClick={() => { setMsg(null); setEditing(true) }}>Изменить</button>
          </div>
        : <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>Старый пароль
              <input className={styles.input} type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} autoFocus required />
            </label>
            <label className={styles.label}>Новый пароль
              <input className={styles.input} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
            </label>
            <label className={styles.label}>Повторите новый пароль
              <input className={styles.input} type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} required />
            </label>
            <StatusMsg ok={ok} msg={msg} />
            <div className={styles.formBtns}>
              <button className={styles.saveBtn} disabled={loading}>{loading ? 'Сохраняем…' : 'Сохранить'}</button>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>Отмена</button>
            </div>
          </form>
      }
      {!editing && <StatusMsg ok={ok} msg={msg} />}
    </Section>
  )
}

function EmailSection({ current, onUpdated }) {
  const [step, setStep]               = useState('view')
  const [newEmailVal, setNewEmailVal] = useState('')
  const [code, setCode]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState(null)
  const [ok, setOk]                   = useState(false)
  const EMAIL_ERRORS   = { '-1': 'Email имеет неверный формат', '-2': 'Этот email уже используется' }
  const CONFIRM_ERRORS = { '-2': 'Неверный код подтверждения', '-3': 'Этот email уже используется' }

  async function handleSubmitEmail(e) {
    e.preventDefault(); setLoading(true); setMsg(null)
    try { await updateEmail(newEmailVal); setStep('confirm') }
    catch (err) { setOk(false); setMsg(EMAIL_ERRORS[String(err.status)] ?? err.msg) }
    finally { setLoading(false) }
  }

  async function handleSubmitCode(e) {
    e.preventDefault(); setLoading(true); setMsg(null)
    try {
      await confirmEmailChange(code); setOk(true); setMsg('Email изменён'); setStep('view'); onUpdated()
    } catch (err) {
      if (err.status === -1) { setStep('edit'); setOk(false); setMsg('Время действия кода истекло. Отправьте запрос повторно.') }
      else { setOk(false); setMsg(CONFIRM_ERRORS[String(err.status)] ?? err.msg) }
    }
    finally { setLoading(false) }
  }

  if (step === 'confirm') return (
    <Section title="Почта">
      <p className={styles.hint}>Введите 6-значный код, отправленный на <strong>{newEmailVal}</strong></p>
      <form onSubmit={handleSubmitCode} className={styles.form}>
        <input className={`${styles.input} ${styles.codeInput}`} type="text" inputMode="numeric"
          maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus required />
        <StatusMsg ok={ok} msg={msg} />
        <div className={styles.formBtns}>
          <button className={styles.saveBtn} disabled={loading || code.length < 6}>{loading ? 'Проверяем…' : 'Подтвердить'}</button>
          <button type="button" className={styles.cancelBtn} onClick={() => setStep('view')}>Отмена</button>
        </div>
      </form>
    </Section>
  )

  if (step === 'edit') return (
    <Section title="Почта">
      <form onSubmit={handleSubmitEmail} className={styles.form}>
        <input className={styles.input} type="email" value={newEmailVal}
          onChange={e => setNewEmailVal(e.target.value)} autoFocus placeholder="Новый email" required />
        <StatusMsg ok={ok} msg={msg} />
        <div className={styles.formBtns}>
          <button className={styles.saveBtn} disabled={loading}>{loading ? 'Отправляем…' : 'Отправить код'}</button>
          <button type="button" className={styles.cancelBtn} onClick={() => setStep('view')}>Отмена</button>
        </div>
      </form>
    </Section>
  )

  return (
    <Section title="Почта">
      <FieldRow label="Текущий email" value={current} onEdit={() => { setNewEmailVal(''); setMsg(null); setStep('edit') }} />
      <StatusMsg ok={ok} msg={msg} />
    </Section>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  useEffect(() => { getProfile().then(setProfile) }, [])
  function reload() { getProfile().then(setProfile) }

  if (!profile) return (
    <main className={styles.main}>
      <div className={styles.state}><span className={styles.spinner} /></div>
    </main>
  )

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Профиль</h1>
        <PersonalSection current={profile} onUpdated={reload} />
        <PasswordSection />
        <EmailSection current={profile.email} onUpdated={reload} />
      </div>
    </main>
  )
}