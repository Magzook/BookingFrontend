import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyBookings, getResources, cancelBooking, getImageUrl } from '../api/client'
import styles from './MyBookingsPage.module.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDuration(d) {
  const h   = Math.floor(d / 60)
  const min = d % 60
  return h > 0 && min > 0 ? `${h} ч ${min} мин`
       : h > 0             ? `${h} ч`
       :                    `${min} мин`
}

function BookingCard({ booking, resource, onCancelled }) {
  const navigate  = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError]           = useState(null)
  const [cancelled, setCancelled]   = useState(false)

  const timeFrom = booking.timeFrom?.slice(0, 5)

  async function handleCancel() {
    if (!confirm('Отменить бронь?')) return
    setCancelling(true); setError(null)
    try {
      await cancelBooking(booking.id)
      setCancelled(true)
      onCancelled()
    } catch (err) {
      const ERRORS = { '-1': 'Бронь вам не принадлежит' }
      setError(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка при отмене')
    } finally { setCancelling(false) }
  }

  if (cancelled) return null

  return (
    <div className={styles.card}>
      <div className={styles.cardLeft}>
        {resource?.firstImageId
          ? <img src={getImageUrl(resource.firstImageId)} alt={resource?.name} className={styles.img} />
          : <div className={styles.imgPlaceholder}><span>♨</span></div>
        }
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.resourceName}>{resource?.name ?? `Ресурс #${booking.resourceId}`}</h3>

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Дата</span>
            <span className={styles.metaValue}>{formatDate(booking.day)}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Начало</span>
            <span className={styles.metaValue}>{timeFrom}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Продолжительность</span>
            <span className={styles.metaValue}>{formatDuration(booking.durationMinutes)}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Стоимость</span>
            <span className={`${styles.metaValue} ${styles.price}`}>
              {Number(booking.price).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Код брони</span>
            <span className={`${styles.metaValue} ${styles.code}`}>{booking.secretCode}</span>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={() => navigate(`/resources/${booking.resourceId}`)}>
            Перейти к ресурсу
          </button>
          <button className={styles.btnCancel} onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Отмена…' : 'Отменить бронь'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyBookingsPage() {
  const [bookings, setBookings]     = useState([])
  const [resourceMap, setResourceMap] = useState({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  function load() {
    Promise.all([getMyBookings(), getResources()])
      .then(([bks, res]) => {
        setBookings(bks)
        setResourceMap(Object.fromEntries(res.map(r => [r.id, r])))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Мои брони</h1>

        {loading && (
          <div className={styles.state}><span className={styles.spinner} /></div>
        )}

        {error && (
          <div className={styles.state}>
            <p className={styles.stateMsg}>Не удалось загрузить брони</p>
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className={styles.state}>
            <p className={styles.stateMsg}>У вас пока нет броней</p>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className={styles.list}>
            {bookings.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                resource={resourceMap[b.resourceId]}
                onCancelled={load}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}