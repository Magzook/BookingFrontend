import React, { useState, useEffect } from 'react';
import { getHostessBookingsByDay, getWorkingDays, cancelHostessBooking } from '../api/client';
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
  const resources = React.useMemo(() => {
    const map = new Map();
    bookings.forEach(b => {
      if (!map.has(b.resource.id)) {
        map.set(b.resource.id, b.resource);
      }
    });
    return Array.from(map.values());
  }, [bookings]);

  const renderGrid = () => {
    if (loading) return <div className={styles.loading}>Загрузка...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (resources.length === 0) return <div className={styles.empty}>Нет бронирований на этот день</div>;

    // Создаём карту заполненности: resourceId -> массив слотов
    const gridMap = {};
    resources.forEach(res => {
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
            {resources.map(resource => {
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
    </div>
  );
};

export default HostessPage;