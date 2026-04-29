import { useLocation, useNavigate } from 'react-router-dom'
import { getImageUrl } from '../api/client'
import styles from './BookingSuccessPage.module.css'

function minsToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function formatDuration(d) {
  const h   = Math.floor(d / 60)
  const min = d % 60
  return h > 0 && min > 0 ? `${h} ч ${min} мин`
       : h > 0             ? `${h} ч`
       :                    `${min} мин`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BookingSuccessPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  // state: { resource: { id, name, firstImageId }, booking: { day, timeFrom, durationMinutes, price, id } }
  if (!state?.booking) {
    navigate('/')
    return null
  }

  const { resource, booking } = state
  const timeFrom = booking.timeFrom?.slice(0, 5) // trim seconds if present
  const timeTo   = (() => {
    const [h, m] = timeFrom.split(':').map(Number)
    const endM   = h * 60 + m + booking.durationMinutes
    return minsToTime(endM)
  })()

  return (
    <main className={styles.main}>
      <div className={styles.card}>

        <div className={styles.checkmark}>✓</div>
        <h1 className={styles.title}>Бронирование подтверждено!</h1>

        {/* Resource preview */}
        <div className={styles.resourcePreview}>
          {resource.firstImageId
            ? <img src={getImageUrl(resource.firstImageId)} alt={resource.name} className={styles.img} />
            : <div className={styles.imgPlaceholder}><span>♨</span></div>
          }
          <p className={styles.resourceName}>{resource.name}</p>
        </div>

        {/* Booking details */}
        <div className={styles.details}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Дата</span>
            <span className={styles.rowValue}>{formatDate(booking.day)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Время</span>
            <span className={styles.rowValue}>{timeFrom} — {timeTo}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Продолжительность</span>
            <span className={styles.rowValue}>{formatDuration(booking.durationMinutes)}</span>
          </div>
          <div className={`${styles.row} ${styles.rowPrice}`}>
            <span className={styles.rowLabel}>Стоимость</span>
            <span className={styles.rowValuePrice}>
              {Number(booking.price).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => navigate('/my-bookings')}>
            Посмотреть мои брони
          </button>
          <button className={styles.btnSecondary} onClick={() => navigate('/')}>
            На главную
          </button>
        </div>

      </div>
    </main>
  )
}