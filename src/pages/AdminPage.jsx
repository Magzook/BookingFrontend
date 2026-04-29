import { useState, useEffect } from 'react'
import { getWorkingDays, addWorkingDay, deleteWorkingDay, getProperties } from '../api/client'
import styles from './AdminPage.module.css'

// ── Mini calendar ──────────────────────────────────────────────────────────

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function Calendar({ workingDays, onAdd, onRemove }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const workingSet = new Set(workingDays)

  // First day of month (0=Sun … 6=Sat → convert to Mon-based)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prev() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1) }
  function next() { month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1) }

  function toggle(day) {
    const iso = toISO(year, month, day)
    workingSet.has(iso) ? onRemove(iso) : onAdd(iso)
  }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className={styles.cal}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prev}>‹</button>
        <span className={styles.calMonth}>{MONTHS[month]} {year}</span>
        <button className={styles.calNav} onClick={next}>›</button>
      </div>

      <div className={styles.calGrid}>
        {DAYS.map(d => <div key={d} className={styles.calDow}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const iso     = toISO(year, month, day)
          const isWork  = workingSet.has(iso)
          const isPast  = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          return (
            <button
              key={day}
              className={`${styles.calDay} ${isWork ? styles.calDayWork : ''} ${isPast ? styles.calDayPast : ''}`}
              onClick={() => toggle(day)}
              title={isWork ? 'Удалить из рабочих' : 'Добавить рабочий день'}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className={styles.calLegend}>
        <span className={styles.legendWork} /> Рабочий день
        <span style={{marginLeft:16, color:'var(--ash)', fontSize:13}}>Клик — переключить</span>
      </div>
    </div>
  )
}

// ── Working days list ──────────────────────────────────────────────────────

function WorkingDaysList({ workingDays, onRemove }) {
  const sorted = [...workingDays].sort()
  if (!sorted.length) return <p className={styles.empty}>Рабочие дни не добавлены</p>

  return (
    <div className={styles.daysList}>
      {sorted.map(d => {
        const [y, m, day] = d.split('-')
        const label = new Date(y, m - 1, day).toLocaleDateString('ru-RU', { weekday:'short', day:'numeric', month:'long', year:'numeric' })
        return (
          <div key={d} className={styles.dayRow}>
            <span className={styles.dayLabel}>{label}</span>
            <button className={styles.removeBtn} onClick={() => onRemove(d)} title="Удалить">✕</button>
          </div>
        )
      })}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  )
}

// ── Properties section ─────────────────────────────────────────────────────

function PropertiesSection({ flash }) {
  const [properties, setProperties]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [newName, setNewName]         = useState('')
  const [adding, setAdding]           = useState(false)
  const [editId, setEditId]           = useState(null)
  const [editName, setEditName]       = useState('')
  const [saving, setSaving]           = useState(false)

  async function load() {
    getProperties().then(setProperties).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      const data = await res.json()
      if (!res.ok) {
        const ERRORS = { '-1': 'Неверный формат названия', '-2': 'Свойство с таким названием уже существует' }
        flash(ERRORS[String(data.status)] ?? data.msg ?? 'Ошибка', false); return
      }
      setProperties(prev => [...prev, { id: data.id, name: newName }])
      setNewName('')
      flash('Свойство добавлено')
    } finally { setAdding(false) }
  }

  async function handleRename(id) {
    setSaving(true)
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: editName })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const ERRORS = { '-1': 'Неверный формат названия', '-2': 'Свойство с таким названием уже существует' }
        flash(ERRORS[String(data.status)] ?? data.msg ?? 'Ошибка', false); return
      }
      setProperties(prev => prev.map(p => p.id === id ? { ...p, name: editName } : p))
      setEditId(null)
      flash('Свойство переименовано')
    } finally { setSaving(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Удалить свойство «${name}»?`)) return
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { flash('Ошибка при удалении', false); return }
      setProperties(prev => prev.filter(p => p.id !== id))
      flash('Свойство удалено')
    } catch { flash('Ошибка при удалении', false) }
  }

  if (loading) return <div className={styles.spinWrap}><span className={styles.spinner} /></div>

  return (
    <div>
      {/* Add form */}
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          className={styles.addInput}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Название нового свойства"
          required
        />
        <button className={styles.addBtn} disabled={adding}>
          {adding ? '…' : '+ Добавить'}
        </button>
      </form>

      {/* List */}
      {properties.length === 0
        ? <p className={styles.empty}>Свойства не добавлены</p>
        : <div className={styles.propList}>
            {properties.map(p => (
              <div key={p.id} className={styles.propRow}>
                {editId === p.id
                  ? <form onSubmit={e => { e.preventDefault(); handleRename(p.id) }} className={styles.editForm}>
                      <input
                        className={styles.editInput}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                        required
                      />
                      <button className={styles.saveBtn} disabled={saving}>✓</button>
                      <button type="button" className={styles.cancelEditBtn} onClick={() => setEditId(null)}>✕</button>
                    </form>
                  : <>
                      <span className={styles.propName}>{p.name}</span>
                      <div className={styles.propActions}>
                        <button className={styles.editBtn} onClick={() => { setEditId(p.id); setEditName(p.name) }}>
                          Переименовать
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(p.id, p.name)}>
                          Удалить
                        </button>
                      </div>
                    </>
                }
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [workingDays, setWorkingDays] = useState([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState(null)
  const [msgOk, setMsgOk]             = useState(false)

  function load() {
    getWorkingDays()
      .then(setWorkingDays)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function flash(text, ok = true) {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleAdd(iso) {
    try {
      await addWorkingDay(iso)
      setWorkingDays(prev => [...prev, iso])
      flash('День добавлен')
    } catch (err) {
      flash(err.status === undefined ? 'Этот день уже добавлен' : (err.msg ?? 'Ошибка'), false)
    }
  }

  async function handleRemove(iso) {
    try {
      await deleteWorkingDay(iso)
      setWorkingDays(prev => prev.filter(d => d !== iso))
      flash('День удалён')
    } catch (err) {
      const ERRORS = { '-1': 'На этот день есть брони — сначала отмените их' }
      flash(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка', false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Панель администратора</h1>

        {msg && <div className={`${styles.toast} ${msgOk ? styles.toastOk : styles.toastErr}`}>{msg}</div>}

        <Section title="Рабочие дни">
          {loading
            ? <div className={styles.spinWrap}><span className={styles.spinner} /></div>
            : <>
                <Calendar workingDays={workingDays} onAdd={handleAdd} onRemove={handleRemove} />
                <h3 className={styles.listTitle}>Список рабочих дней</h3>
                <WorkingDaysList workingDays={workingDays} onRemove={handleRemove} />
              </>
          }
        </Section>

        <Section title="Свойства помещений">
          <PropertiesSection flash={flash} />
        </Section>
      </div>
    </main>
  )
}