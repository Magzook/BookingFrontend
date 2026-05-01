import React, { useState, useEffect } from 'react';
import { getHostessBookingsByDay, getResources, getWorkingDays, getHostessBookingByCode } from '../api/client';
import styles from './HostessPage.module.css';

const HostessPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [resources, setResources] = useState([]);
  const [workingDays, setWorkingDays] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояние для модального окна деталей
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Состояние для поиска по коду
  const [searchCode, setSearchCode] = useState('');
  const [searchError, setSearchError] = useState(null);

  // Константы времени: с 09:00 до 22:00
  const START_HOUR = 9;
  const END_HOUR = 22;
  const SLOT_DURATION = 15; // минут
  const SLOTS_PER_HOUR = 60 / SLOT_DURATION;
  const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

  // Генерация заголовков времени для КАЖДОГО слота (15 мин)
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
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resourcesData, workingDaysData] = await Promise.all([
          getResources(),
          getWorkingDays()
        ]);
        
        setResources(resourcesData);
        setWorkingDays(workingDaysData);

        const bookingsData = await getHostessBookingsByDay(selectedDate);
        setBookings(bookingsData);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Этот день не является рабочим или данные недоступны.");
        } else {
          setError("Ошибка загрузки данных: " + (err.message || "Неизвестная ошибка"));
        }
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // Преобразование времени (HH:mm) в индекс слота
  const timeToSlotIndex = (timeStr) => {
    // timeStr может приходить как "09:00:00" или "09:00"
    const parts = timeStr.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    
    const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
    return Math.round(totalMinutesFromStart / SLOT_DURATION);
  };

  const renderGrid = () => {
    if (loading) return <div className={styles.loading}>Загрузка...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (resources.length === 0) return <div className={styles.empty}>Нет доступных помещений</div>;

    // Создаем карту заполненности: resourceId -> массив слотов
    const gridMap = {};
    resources.forEach(res => {
      gridMap[res.id] = new Array(TOTAL_SLOTS).fill(null);
    });

    // Сортируем брони для правильного чередования цветов внутри ресурса
    const sortedBookings = [...bookings].sort((a, b) => {
      if (a.resourceId !== b.resourceId) return a.resourceId - b.resourceId;
      return timeToSlotIndex(a.timeFrom) - timeToSlotIndex(b.timeFrom);
    });

    // Заполняем сетку и определяем цвета
    const lastEndSlot = {}; 

    sortedBookings.forEach((booking) => {
      const startSlot = timeToSlotIndex(booking.timeFrom);
      const durationSlots = booking.durationMinutes / SLOT_DURATION;
      const endSlot = startSlot + durationSlots;

      let colorClass = styles.slotBlack; 
      
      if (lastEndSlot[booking.resourceId] !== undefined) {
        if (startSlot === lastEndSlot[booking.resourceId]) {
          const prevSlotObj = gridMap[booking.resourceId][startSlot - 1];
          if (prevSlotObj && prevSlotObj.resourceId === booking.resourceId) {
             colorClass = prevSlotObj.colorClass === styles.slotBlack ? styles.slotGray : styles.slotBlack;
          }
        }
      }
      
      lastEndSlot[booking.resourceId] = endSlot;

      for (let i = 0; i < durationSlots; i++) {
        const slotIndex = startSlot + i;
        if (slotIndex < TOTAL_SLOTS) {
          gridMap[booking.resourceId][slotIndex] = {
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
                <th key={timeStr} className={styles.timeHeader}>
                  {timeStr}
                </th>
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
                  // Находим имя ресурса для отображения (хотя оно уже есть в замыкании resource.name)
                  // Но для безопасности можно использовать resource.name напрямую
                  rowCells.push(
                    <td 
                      key={`${resource.id}-${i}`} 
                      className={`${styles.bookedSlot} ${cell.colorClass}`}
                      colSpan={cell.span}
                      onClick={() => setSelectedBooking({ ...cell, resourceName: resource.name })}
                      title={`Пользователь: ${cell.userId}\nНачало: ${cell.timeFrom}\nДлительность: ${cell.durationMinutes} мин\nЦена: ${cell.price}`}
                    >
                    </td>
                  );
                  i += cell.span;
                } else {
                  rowCells.push(
                    <td key={`${resource.id}-${i}`} className={styles.emptySlot}></td>
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

  // Обработчик поиска по коду
  const handleSearchByCode = async () => {
    if (!searchCode.trim()) {
      setSearchError("Введите код брони");
      return;
    }
    
    setSearchError(null);
    try {
      const bookingData = await getHostessBookingByCode(searchCode.trim());
      // Находим имя ресурса для отображения в модалке
      const resource = resources.find(r => r.id === bookingData.resourceId);
      const resourceName = resource ? resource.name : `ID: ${bookingData.resourceId}`;
      
      setSelectedBooking({
        ...bookingData,
        resourceName,
        isSearchResult: true // Флаг, чтобы отличать от клика по таблице (опционально)
      });
      setSearchCode(''); // Очистить поле после успеха
    } catch (err) {
      if (err.response?.status === 404 || (err.status && err.status === -1)) { // Адаптация под формат ошибки
         setSearchError("Бронь с таким кодом не найдена");
      } else {
         setSearchError("Ошибка поиска: " + (err.msg || err.message || "Неизвестная ошибка"));
      }
    }
  };

  // Форматирование времени (убираем секунды)
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // "HH:MM"
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

      {/* Секция поиска по коду - ТЕПЕРЬ НИЖЕ ТАБЛИЦЫ */}
      <div className={styles.searchSection}>
        <h3>Найти бронь по коду</h3>
        <div className={styles.searchForm}>
          <input 
            type="text" 
            placeholder="Введите код брони" 
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchByCode()}
            className={styles.searchInput}
          />
          <button onClick={handleSearchByCode} className={styles.searchBtn}>Найти</button>
        </div>
        {searchError && <div className={styles.searchError}>{searchError}</div>}
      </div>

      {selectedBooking && (
        <div className={styles.modalOverlay} onClick={() => setSelectedBooking(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Детали бронирования</h2>
            
            <p><strong>Помещение:</strong> {selectedBooking.resourceName}</p>
            <p><strong>Пользователь ID:</strong> {selectedBooking.userId}</p>
            <p><strong>Время начала:</strong> {formatTime(selectedBooking.timeFrom)}</p>
            <p><strong>Продолжительность:</strong> {selectedBooking.durationMinutes} мин.</p>
            <p><strong>Стоимость:</strong> {selectedBooking.price} руб.</p>
            
            <button className={styles.closeBtn} onClick={() => setSelectedBooking(null)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostessPage;