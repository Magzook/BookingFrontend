import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResource, getWorkingDays, getProperties, getImageUrl, createBooking } from '../api/client'
import styles from './ResourcePage.module.css'

const WORK_START = 9 * 60  // 09:00 in minutes
const WORK_END   = 22 * 60 // 22:00 in minutes
const STEP       = 15

// Generate all possible start times as minutes from midnight
function allSlots() {
  const slots = []
  for (let m = WORK_START; m < WORK_END; m += STEP) slots.push(m)
  return slots
}

function minsToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function timeToMins(t) {
  const [h, min] = t.split(':').map(Number)
  return h * 60 + min
}

// Durations available given start time (must end by 22:00)
function durationsFor(startMins) {
  const maxMins = WORK_END - startMins
  const result = []
  for (let d = STEP; d <= maxMins; d += STEP) result.push(d)
  return result
}

// ── Booking timeline ───────────────────────────────────────────────────────
function Timeline({ bookings }) {
  const total = WORK_END - WORK_START

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineLabels}>
        {[9,11,13,15,17,19,21].map(h => (
          <span key={h} style={{ left: `${(h*60 - WORK_START) / total * 100}%` }}>{h}:00</span>
        ))}
      </div>
      <div className={styles.timelineBar}>
        {bookings.map((b, i) => {
          const start = timeToMins(b.timeFrom) - WORK_START
          const end   = start + b.durationMinutes
          return (
            <div key={i} className={styles.bookedBlock} style={{
              left:  `${start / total * 100}%`,
              width: `${b.durationMinutes / total * 100}%`,
            }} title={`${b.timeFrom} — ${minsToTime(timeToMins(b.timeFrom) + b.durationMinutes)}`} />
          )
        })}
      </div>
    </div>
  )
}

// ── Booking form ───────────────────────────────────────────────────────────
function BookingForm({ resource, workingDays, onBooked }) {
  const navigate = useNavigate()
  const [day, setDay]           = useState('')
  const [startMins, setStartMins] = useState(WORK_START)
  const [duration, setDuration] = useState(60)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState(null)
  const [ok, setOk]             = useState(false)
  const selectedDayBookings = useMemo(() => {
    if (!day) return []
    const entry = resource.allBookings?.find(b => b.day === day)
    return entry?.bookings ?? []
  }, [day, resource])

  function isOverlap(startM, durM) {
    const endM = startM + durM
    return selectedDayBookings.some(b => {
      const bs = timeToMins(b.timeFrom)
      const be = bs + b.durationMinutes
      return startM < be && endM > bs
    })
  }

  const durations = durationsFor(startMins).filter(d => !isOverlap(startMins, d))
  const currentDurOk = !isOverlap(startMins, duration)

  useEffect(() => {
    if (durations.length > 0 && !currentDurOk) setDuration(durations[0])
  }, [startMins, day])

  const price = resource.pricePerHour * duration / 60

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      const result = await createBooking(resource.id, day, minsToTime(startMins) + ':00', duration)
      navigate('/booking-success', {
        state: {
          resource: {
            id:           resource.id,
            name:         resource.name,
            firstImageId: resource.imagesIds?.[0] ?? null,
          },
          booking: {
            day,
            timeFrom:        minsToTime(startMins),
            durationMinutes: duration,
            price:           resource.pricePerHour * duration / 60,
            id:              result.id,
          }
        }
      })
    } catch (err) {
      setOk(false)
      const ERRORS = {
        '-1': 'Этот день не является рабочим',
        '-2': 'Выбранное время пересекается с существующей бронью',
        '-3': 'Время должно быть кратно 15 минутам',
        '-4': 'Время должно быть в диапазоне 09:00–21:45',
        '-5': 'Продолжительность должна быть кратна 15 минутам',
        '-6': 'Бронь должна закончиться до 22:00',
      }
      setMsg(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка')
    } finally { setLoading(false) }
  }

  if (workingDays.length === 0) return (
    <p className={styles.noWorkDays}>Рабочие дни ещё не добавлены</p>
  )

  return (
    <form onSubmit={handleSubmit} className={styles.bookForm}>
      <label className={styles.bLabel}>
        Дата
        <select className={styles.bSelect} value={day} onChange={e => setDay(e.target.value)} required>
          <option value="">— выберите день —</option>
          {workingDays.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      {day && (
        <>
          {selectedDayBookings.length > 0 && (
            <div>
              <p className={styles.bHint}>Занятое время:</p>
              <Timeline bookings={selectedDayBookings} />
            </div>
          )}

          <label className={styles.bLabel}>
            Начало
            <select className={styles.bSelect} value={startMins} onChange={e => setStartMins(Number(e.target.value))}>
              {allSlots().map(m => (
                <option key={m} value={m} disabled={isOverlap(m, STEP)}>
                  {minsToTime(m)}{isOverlap(m, STEP) ? ' — занято' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.bLabel}>
            Продолжительность
            {durations.length === 0
              ? <p className={styles.noDur}>Нет доступного времени с этого момента</p>
              : <select className={styles.bSelect} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  {durationsFor(startMins).map(d => {
                    const h   = Math.floor(d / 60)
                    const min = d % 60
                    const label = h > 0 && min > 0 ? `${h} ч ${min} мин`
                                : h > 0             ? `${h} ч`
                                :                    `${min} мин`
                    return (
                      <option key={d} value={d} disabled={isOverlap(startMins, d)}>
                        {label}{isOverlap(startMins, d) ? ' — занято' : ''}
                      </option>
                    )
                  })}
                </select>
            }
          </label>

          {durations.length > 0 && (
            <div className={styles.pricePreview}>
              <span>{minsToTime(startMins)} — {minsToTime(startMins + duration)}</span>
              <span className={styles.priceAmt}>{price.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
            </div>
          )}
        </>
      )}

      {msg && <p className={ok ? styles.bookOk : styles.bookErr}>{msg}</p>}

      <button className={styles.bookSubmit} disabled={loading || !day || durations.length === 0}>
        {loading ? 'Бронируем…' : 'Забронировать'}
      </button>
    </form>
  )
}

// ── Image gallery ──────────────────────────────────────────────────────────
function Gallery({ imagesIds }) {
  const [active, setActive] = useState(0)
  if (!imagesIds?.length) return (
    <div className={styles.noPhoto}><span>♨</span><p>Фото отсутствуют</p></div>
  )
  return (
    <div className={styles.gallery}>
      <div className={styles.galleryMain}>
        <img src={getImageUrl(imagesIds[active])} alt="" className={styles.galleryImg} />
      </div>
      {imagesIds.length > 1 && (
        <div className={styles.galleryThumbs}>
          {imagesIds.map((id, i) => (
            <img key={id} src={getImageUrl(id)} alt="" className={`${styles.thumb} ${i === active ? styles.thumbActive : ''}`}
              onClick={() => setActive(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ResourcePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resource, setResource]       = useState(null)
  const [workingDays, setWorkingDays] = useState([])
  const [propertiesMap, setPropertiesMap] = useState({})
  const [loading, setLoading]         = useState(true)

  function load() {
    Promise.all([getResource(id), getWorkingDays(), getProperties()])
      .then(([res, days, props]) => {
        setResource(res)
        setWorkingDays(days.sort())
        setPropertiesMap(Object.fromEntries(props.map(p => [p.id, p.name])))
      })
      .catch(() => navigate('/resources'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <main className={styles.main}><div className={styles.spinWrap}><span className={styles.spinner} /></div></main>
  )

  if (!resource) return null

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => navigate('/resources')}>← Назад к каталогу</button>

        <div className={styles.layout}>
          {/* Left column */}
          <div className={styles.left}>
            <Gallery imagesIds={resource.imagesIds} />

            <div className={styles.info}>
              <h1 className={styles.name}>{resource.name}</h1>
              <p className={styles.price}>{resource.pricePerHour?.toLocaleString('ru-RU')} ₽/час</p>

              {resource.shortDescription && (
                <p className={styles.short}>{resource.shortDescription}</p>
              )}
              {resource.fullDescription && (
                <p className={styles.full}>{resource.fullDescription}</p>
              )}

              {resource.propertiesIds?.length > 0 && (
                <div className={styles.propWrap}>
                  {resource.propertiesIds.map(pid => (
                    <span key={pid} className={styles.prop}>{propertiesMap[pid] ?? pid}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — booking */}
          <div className={styles.right}>
            <div className={styles.bookCard}>
              <h2 className={styles.bookTitle}>Бронирование</h2>
              <p className={styles.bookHint}>Рабочее время: 09:00 – 22:00</p>
              <BookingForm resource={{ ...resource, id: Number(id) }} workingDays={workingDays} onBooked={load} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}