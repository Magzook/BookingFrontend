import { useState } from 'react'
import styles from './BookingCalendar.module.css'

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DOWS_RU   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function BookingCalendar({ workingDays, selected, onSelect }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const workingSet   = new Set(workingDays)
  const firstDow     = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth  = new Date(year, month + 1, 0).getDate()

  function prev() { month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1) }
  function next() { month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1) }

  function toISO(d) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className={styles.bookCal}>
      <div className={styles.bookCalHeader}>
        <button type="button" className={styles.bookCalNav} onClick={prev}>‹</button>
        <span className={styles.bookCalMonth}>{MONTHS_RU[month]} {year}</span>
        <button type="button" className={styles.bookCalNav} onClick={next}>›</button>
      </div>
      <div className={styles.bookCalGrid}>
        {DOWS_RU.map(d => <div key={d} className={styles.bookCalDow}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const iso      = toISO(day)
          const isWork   = workingSet.has(iso)
          const isSel    = iso === selected
          const isPast   = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          return (
            <button
              key={day}
              type="button"
              disabled={!isWork || isPast}
              className={`${styles.bookCalDay}
                ${isWork && !isPast ? styles.bookCalDayWork : ''}
                ${isSel             ? styles.bookCalDaySel  : ''}
                ${isPast || !isWork ? styles.bookCalDayOff  : ''}`}
              onClick={() => onSelect(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
