import React, { useState, useEffect } from 'react';
import { getHostessBookingsByDay, getWorkingDays, cancelHostessBooking, getResources, createHostessBooking, getResource } from '../api/client';
import styles from './HostessPage.module.css';

const HostessPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workingDays, setWorkingDays] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // States for booking form
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [resourceBookings, setResourceBookings] = useState([]);
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingDuration, setBookingDuration] = useState(60);
  const [guestData, setGuestData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    birthDate: '',
    documentNumber: ''
  });
  const [bookingMsg, setBookingMsg] = useState(null);
  const [bookingOk, setBookingOk] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Константы времени: с 09:00 до 22:00
  const START_HOUR = 9;
  const END_HOUR = 22;
  const SLOT_DURATION = 15; // минут
  const SLOTS_PER_HOUR = 60 / SLOT_DURATION;
  const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

  // Генерация заголовков времени для каждого слота (15 мин)
  const timeLabels = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const totalMinutes = i * SLOT_DURATION;
    const hours = Math.floor(totalMinutes / 60) + START_HOUR;
    const minutes = totalMinutes % 60;
    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    timeLabels.push(`${hStr}:${mStr}`);
  }

  useEffect(() => {
    const fetchWorkingDays = async () => {
      try {
        const data = await getWorkingDays();
        setWorkingDays(data);
      } catch {
        // не критично
      }
    };
    fetchWorkingDays();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getHostessBookingsByDay(selectedDate);
        setBookings(data);
      } catch (err) {
        if (err.status === 404) {
          setError("Этот день не является рабочим или данные недоступны.");
        } else {
          setError("Ошибка загрузки данных: " + (err.msg || err.message || "Неизвестная ошибка"));
        }
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [selectedDate]);

  // Преобразование времени (HH:mm или HH:mm:ss) в индекс слота
  const timeToSlotIndex = (timeStr) => {
    const parts = timeStr.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
    return Math.round(totalMinutesFromStart / SLOT_DURATION);
  };

  // Собираем уникальные ресурсы из броней
  const resourcesFromBookings = React.useMemo(() => {
    const map = new Map();
    bookings.forEach(b => {
      if (!map.has(b.resource.id)) {
        map.set(b.resource.id, b.resource);
      }
    });
    return Array.from(map.values());
  }, [bookings]);

  // Fetch all resources on mount
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const data = await getResources();
        setResources(data);
        if (data.length > 0 && !selectedResourceId) {
          setSelectedResourceId(String(data[0].id));
        }
      } catch (err) {
        // ignore
      }
    };
    fetchResources();
  }, []);

  // Fetch resource bookings when selected resource or date changes
  useEffect(() => {
    if (!selectedResourceId) return;
    const fetchResourceBookings = async () => {
      try {
        const data = await getResource(selectedResourceId);
        const dayEntry = data.all_bookings?.find(b => b.day === selectedDate);
        setResourceBookings(dayEntry?.bookings ?? []);
      } catch (err) {
        setResourceBookings([]);
      }
    };
    fetchResourceBookings();
  }, [selectedResourceId, selectedDate]);

  const renderGrid = () => {
    if (loading) return <div className={styles.loading}>Загрузка...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (resourcesFromBookings.length === 0) return <div className={styles.empty}>Нет бронирований на этот день</div>;

    // Создаём карту заполненности: resourceId -> массив слотов
    const gridMap = {};
    resourcesFromBookings.forEach(res => {
      gridMap[res.id] = new Array(TOTAL_SLOTS).fill(null);
    });

    const sortedBookings = [...bookings].sort((a, b) => {
      if (a.resource.id !== b.resource.id) return a.resource.id - b.resource.id;
      return timeToSlotIndex(a.timeFrom) - timeToSlotIndex(b.timeFrom);
    });

    const lastEndSlot = {};

    sortedBookings.forEach((booking) => {
      const startSlot = timeToSlotIndex(booking.timeFrom);
      const durationSlots = booking.durationMinutes / SLOT_DURATION;
      const endSlot = startSlot + durationSlots;
      const rid = booking.resource.id;

      let colorClass = styles.slotBlack;

      if (lastEndSlot[rid] !== undefined && startSlot === lastEndSlot[rid]) {
        const prevSlotObj = gridMap[rid][startSlot - 1];
        if (prevSlotObj && prevSlotObj.resource.id === rid) {
          colorClass = prevSlotObj.colorClass === styles.slotBlack ? styles.slotGray : styles.slotBlack;
        }
      }

      lastEndSlot[rid] = endSlot;

      for (let i = 0; i < durationSlots; i++) {
        const slotIndex = startSlot + i;
        if (slotIndex < TOTAL_SLOTS) {
          gridMap[rid][slotIndex] = {
            ...booking,
            colorClass,
            isStart: i === 0,
            span: durationSlots
          };
        }
      }
    });

    return (
      <div className={styles.tableContainer}>
        <table className={styles.bookingsTable}>
          <thead>
            <tr>
              <th className={styles.resourceHeader}>Помещение</th>
              {timeLabels.map((timeStr) => (
                <th key={timeStr} className={styles.timeHeader}>{timeStr}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resourcesFromBookings.map(resource => {
              const rowCells = [];
              let i = 0;
              while (i < TOTAL_SLOTS) {
                const cell = gridMap[resource.id][i];
                if (cell && cell.isStart) {
                  const g = cell.guest;
                  const guestName = [g.lastName, g.firstName, g.middleName].filter(Boolean).join(' ');
                  rowCells.push(
                    <td
                      key={`${resource.id}-${i}`}
                      className={`${styles.bookedSlot} ${cell.colorClass}`}
                      colSpan={cell.span}
                      onClick={() => setSelectedBooking(cell)}
                      title={`${guestName}\n${cell.timeFrom} · ${cell.durationMinutes} мин · ${cell.price} руб.`}
                    />
                  );
                  i += cell.span;
                } else {
                  rowCells.push(
                    <td key={`${resource.id}-${i}`} className={styles.emptySlot} />
                  );
                  i++;
                }
              }
              return (
                <tr key={resource.id}>
                  <td className={styles.resourceName}>{resource.name}</td>
                  {rowCells}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const isWorkingDay = (dateStr) => {
    if (workingDays.length === 0) return true;
    return workingDays.includes(dateStr);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
    setConfirmCancel(false);
    setCancelError(null);
  };

  const handleCancelBooking = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelHostessBooking(selectedBooking.id);
      handleCloseModal();
      const data = await getHostessBookingsByDay(selectedDate);
      setBookings(data);
    } catch (err) {
      setCancelError(err.msg || "Ошибка при отмене бронирования");
      setConfirmCancel(false);
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Booking form helpers ───────────────────────────────────────────────
  const WORK_START = 9 * 60;  // 09:00 in minutes
  const WORK_END = 22 * 60;   // 22:00 in minutes
  const STEP = 15;

  function minsToTime(m) {
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  function timeToMins(t) {
    const [h, min] = t.split(':').map(Number);
    return h * 60 + min;
  }

  function allSlots() {
    const slots = [];
    for (let m = WORK_START; m < WORK_END; m += STEP) slots.push(m);
    return slots;
  }

  function durationsFor(startMins) {
    const maxMins = WORK_END - startMins;
    const result = [];
    for (let d = STEP; d <= maxMins; d += STEP) result.push(d);
    return result;
  }

  function isOverlap(startM, durM) {
    const endM = startM + durM;
    return resourceBookings.some(b => {
      const bs = timeToMins(b.time_from);
      const be = bs + b.duration_minutes;
      return startM < be && endM > bs;
    });
  }

  const bookingStartMins = timeToMins(bookingTime);
  const availableDurations = durationsFor(bookingStartMins).filter(d => !isOverlap(bookingStartMins, d));
  const currentDurationOk = !isOverlap(bookingStartMins, bookingDuration);

  useEffect(() => {
    if (availableDurations.length > 0 && !currentDurationOk) {
      setBookingDuration(availableDurations[0]);
    }
  }, [bookingTime, selectedDate, selectedResourceId]);

  const selectedResource = resources.find(r => String(r.id) === selectedResourceId);
  const price = selectedResource ? selectedResource.pricePerHour * bookingDuration / 60 : 0;

  async function handleCreateBooking(e) {
    e.preventDefault();
    setBookingLoading(true);
    setBookingMsg(null);
    setBookingOk(false);
    try {
      const bookingData = {
        lastName: guestData.lastName,
        firstName: guestData.firstName,
        middleName: guestData.middleName,
        birthDate: guestData.birthDate,
        documentNumber: guestData.documentNumber,
        day: selectedDate,
        timeFrom: bookingTime + ':00',
        durationMinutes: bookingDuration
      };
      await createHostessBooking(selectedResourceId, bookingData);
      setBookingOk(true);
      setBookingMsg('Бронь успешно создана!');
      // Reset form
      setGuestData({ lastName: '', firstName: '', middleName: '', birthDate: '', documentNumber: '' });
      setBookingTime('09:00');
      setBookingDuration(60);
      // Refresh bookings grid
      const data = await getHostessBookingsByDay(selectedDate);
      setBookings(data);
    } catch (err) {
      setBookingOk(false);
      const ERRORS = {
        '-1': 'Этот день не является рабочим',
        '-2': 'Выбранное время пересекается с существующей бронью',
        '-3': 'Время должно быть кратно 15 минутам',
        '-4': 'Время должно быть в диапазоне 09:00–21:45',
        '-5': 'Продолжительность должна быть кратна 15 минутам',
        '-6': 'Бронь должна закончиться до 22:00',
      };
      setBookingMsg(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка');
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className={styles.hostessPage}>
      <h1>Панель хостеса</h1>

      <div className={styles.controls}>
        <label>
          Дата:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        {!isWorkingDay(selectedDate) && workingDays.length > 0 && (
          <span className={styles.warning}>Выбранный день не является рабочим</span>
        )}
      </div>

      {renderGrid()}

      {selectedBooking && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Детали бронирования</h2>

            <p><strong>Помещение</strong>{selectedBooking.resource.name}</p>
            <p><strong>Гость</strong>
              {[selectedBooking.guest.lastName, selectedBooking.guest.firstName, selectedBooking.guest.middleName]
                .filter(Boolean).join(' ')}
            </p>
            <p><strong>Дата рождения</strong>{formatDate(selectedBooking.guest.birthDate)}</p>
            <p><strong>Документ</strong>{selectedBooking.guest.documentNumber}</p>
            <p><strong>Зарегистрирован</strong>{selectedBooking.guest.isRegistered ? 'Да' : 'Нет'}</p>
            <p><strong>Начало</strong>{formatTime(selectedBooking.timeFrom)}</p>
            <p><strong>Длительность</strong>{selectedBooking.durationMinutes} мин.</p>
            <p><strong>Стоимость</strong>{selectedBooking.price} руб.</p>

            {cancelError && <div className={styles.cancelError}>{cancelError}</div>}

            {!selectedBooking.guest.isRegistered && (
              confirmCancel ? (
                <div className={styles.confirmBlock}>
                  <p className={styles.confirmText}>Вы уверены, что хотите отменить бронь?</p>
                  <div className={styles.confirmButtons}>
                    <button
                      className={styles.confirmYesBtn}
                      onClick={handleCancelBooking}
                      disabled={cancelLoading}
                    >
                      {cancelLoading ? 'Отмена...' : 'Да, отменить'}
                    </button>
                    <button
                      className={styles.confirmNoBtn}
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelLoading}
                    >
                      Нет
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.cancelBookingBtn}
                  onClick={() => setConfirmCancel(true)}
                >
                  Отменить бронь
                </button>
              )
            )}

            <button className={styles.closeBtn} onClick={handleCloseModal}>Закрыть</button>
          </div>
        </div>
      )}

      {/* ── Create booking for unregistered guest ─────────────────────────── */}
      <div className={styles.createBookingSection}>
        <h2>Создание брони для незарегистрированного гостя</h2>
        <form onSubmit={handleCreateBooking} className={styles.createBookingForm}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Помещение
              <select
                className={styles.formSelect}
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
              >
                {resources.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Дата
              <input
                type="date"
                className={styles.formInput}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
            {!isWorkingDay(selectedDate) && workingDays.length > 0 && (
              <span className={styles.warningSmall}>Не рабочий день</span>
            )}
          </div>

          <div className={styles.formRowTwo}>
            <label className={styles.formLabel}>
              Время начала
              <select
                className={styles.formSelect}
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              >
                {allSlots().map(m => {
                  const timeStr = minsToTime(m);
                  const occupied = isOverlap(m, STEP);
                  return (
                    <option key={m} value={timeStr} disabled={occupied}>
                      {timeStr}{occupied ? ' — занято' : ''}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className={styles.formLabel}>
              Продолжительность
              {availableDurations.length === 0 ? (
                <p className={styles.noDur}>Нет доступного времени</p>
              ) : (
                <select
                  className={styles.formSelect}
                  value={bookingDuration}
                  onChange={(e) => setBookingDuration(Number(e.target.value))}
                >
                  {durationsFor(bookingStartMins).map(d => {
                    const h = Math.floor(d / 60);
                    const min = d % 60;
                    const label = h > 0 && min > 0 ? `${h} ч ${min} мин`
                                : h > 0 ? `${h} ч`
                                : `${min} мин`;
                    const occupied = isOverlap(bookingStartMins, d);
                    return (
                      <option key={d} value={d} disabled={occupied}>
                        {label}{occupied ? ' — занято' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </label>
          </div>

          {availableDurations.length > 0 && selectedResource && (
            <div className={styles.pricePreview}>
              <span>{bookingTime} — {minsToTime(bookingStartMins + bookingDuration)}</span>
              <span className={styles.priceAmt}>{price.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
            </div>
          )}

          <div className={styles.guestFields}>
            <h3>Данные гостя</h3>
            <div className={styles.formRowTwo}>
              <label className={styles.formLabel}>
                Фамилия
                <input
                  type="text"
                  className={styles.formInput}
                  value={guestData.lastName}
                  onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                  required
                />
              </label>
              <label className={styles.formLabel}>
                Имя
                <input
                  type="text"
                  className={styles.formInput}
                  value={guestData.firstName}
                  onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                  required
                />
              </label>
            </div>
            <label className={styles.formLabel}>
              Отчество
              <input
                type="text"
                className={styles.formInput}
                value={guestData.middleName}
                onChange={(e) => setGuestData({ ...guestData, middleName: e.target.value })}
              />
            </label>
            <div className={styles.formRowTwo}>
              <label className={styles.formLabel}>
                Дата рождения
                <input
                  type="date"
                  className={styles.formInput}
                  value={guestData.birthDate}
                  onChange={(e) => setGuestData({ ...guestData, birthDate: e.target.value })}
                  required
                />
              </label>
              <label className={styles.formLabel}>
                Номер документа
                <input
                  type="text"
                  className={styles.formInput}
                  value={guestData.documentNumber}
                  onChange={(e) => setGuestData({ ...guestData, documentNumber: e.target.value })}
                  required
                />
              </label>
            </div>
          </div>

          {bookingMsg && (
            <p className={bookingOk ? styles.bookOk : styles.bookErr}>{bookingMsg}</p>
          )}

          <button
            type="submit"
            className={styles.bookSubmit}
            disabled={bookingLoading || !selectedResourceId || !selectedDate || availableDurations.length === 0}
          >
            {bookingLoading ? 'Бронируем…' : 'Забронировать'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HostessPage;