// src/components/Admin.js
import React, { useEffect, useState, useRef } from 'react';
import './Admin.css';
import { db } from '../firebase';
import {
  ref,
  update,
  onValue,
  runTransaction,
  remove,
  onChildAdded,
  onChildChanged,
  push
} from 'firebase/database';

const initialStatuses = {
  vr1: { status: 'Свободно', until: null },
  vr2: { status: 'Свободно', until: null },
  vr3: { status: 'Свободно', until: null },
  vr4: { status: 'Свободно', until: null },
  ps1: { status: 'Свободно', until: null },
  ps2: { status: 'Свободно', until: null },
  billiard1: { status: 'Свободно', until: null },
  billiard2: { status: 'Свободно', until: null }
};

const getTodayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function Admin() {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [dailyStats, setDailyStats] = useState({ vr: 0, ps: 0, billiard: 0 });
  const [bookingsList, setBookingsList] = useState([]);
  const [logs, setLogs] = useState([]);
  const timersRef = useRef({});

  const todayKey = getTodayKey();
  const logsRefPath = `logs/${todayKey}`;

  // Write entry to Firebase log
  const addLog = entry => {
    const logRef = ref(db, logsRefPath);
    push(logRef, {
      timestamp: Date.now(),
      entry
    });
  };

  // Subscribe to logs for today
  useEffect(() => {
    const logRef = ref(db, logsRefPath);
    const unsub = onValue(logRef, snap => {
      const data = snap.val() || {};
      const list = Object.values(data)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(item => `${new Date(item.timestamp).toLocaleString()}: ${item.entry}`);
      setLogs(list);
    });
    return () => unsub();
  }, [logsRefPath]);

  // 1) Load statuses for display, and separately manage per-key timers
  useEffect(() => {
    const statusesRef = ref(db, 'statuses');

    // Initial load of all statuses
    const unsubValue = onValue(statusesRef, snap => {
      const data = snap.val() || {};
      const merged = { ...initialStatuses, ...data };
      setStatuses(merged);
    });

    // Handler for each child added/changed
    const handleStatusChange = snap => {
      const key = snap.key;
      const data = snap.val() || {};
      const { status, until } = { ...initialStatuses[key], ...data };

      // Clear previous timer for this key
      if (timersRef.current[key]) {
        clearTimeout(timersRef.current[key]);
        delete timersRef.current[key];
      }

      // If now occupied — schedule reset
      if (status === 'Занято' && until) {
        const timeLeft = until - Date.now();
        if (timeLeft <= 0) {
          // already expired
          resetStatus(key);
        } else {
          timersRef.current[key] = setTimeout(() => {
            resetStatus(key);
            delete timersRef.current[key];
          }, timeLeft);
        }
      }
    };

    const unsubAdded = onChildAdded(statusesRef, handleStatusChange);
    const unsubChanged = onChildChanged(statusesRef, handleStatusChange);

    return () => {
      unsubValue();
      unsubAdded();
      unsubChanged();
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  // 2) Load today's aggregated stats
  useEffect(() => {
    const statsRef = ref(db, `dailyStats/${todayKey}`);
    const unsub = onValue(statsRef, snap => {
      const data = snap.val() || {};
      setDailyStats({ vr: 0, ps: 0, billiard: 0, ...data });
    });
    return () => unsub();
  }, [todayKey]);

  // 3) Subscribe to bookings list and log new additions
  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');

    const unsubList = onValue(bookingsRef, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, entry]) => ({ id, ...entry }));
      setBookingsList(list);
    });
    const unsubChild = onChildAdded(bookingsRef, snap => {
      const b = snap.val();
      addLog(`Новое бронирование: ${b.name}, ${b.service}, ${b.date} в ${b.time}`);
    });

    return () => {
      unsubList();
      unsubChild();
    };
  }, []);

  const resetStatus = async key => {
    const free = { status: 'Свободно', until: null };
    try {
      await update(ref(db, 'statuses'), { [key]: free });
      addLog(`Автовосстановление ${key} — статус «Свободно»`);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadLog = () => {
    const format = ms => `${Math.floor(ms / 3600000)} ч ${Math.floor((ms % 3600000) / 60000)} мин`;
    const historyHeader = ['=== История бронирований ==='];
    const summaryHeader = [
      '',
      '=== Итоги за день ===',
      `Дата: ${todayKey}`,
      `VR: ${format(dailyStats.vr)}`,
      `PlayStation: ${format(dailyStats.ps)}`,
      `Бильярд: ${format(dailyStats.billiard)}`
    ];
    const allLines = [...historyHeader, ...logs, ...summaryHeader];
    const blob = new Blob([allLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_${todayKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteBooking = async id => {
    try {
      await remove(ref(db, `bookings/${id}`));
      addLog(`Удалено бронирование ID=${id}`);
    } catch (e) {
      console.error(e);
      addLog(`Ошибка удаления брони ID=${id}: ${e.message}`);
    }
  };

  const confirmBooking = async () => {
    if (!selectedItem) return;
    const totalMs = hours * 3600000 + minutes * 60000;
    if (totalMs <= 0) return;
    const until = Date.now() + totalMs;
    try {
      await update(ref(db, 'statuses'), { [selectedItem]: { status: 'Занято', until } });
      addLog(`Бронирование ${selectedItem}: ${hours} ч ${minutes} мин`);
      const cat = selectedItem.startsWith('vr')
        ? 'vr'
        : selectedItem.startsWith('ps')
        ? 'ps'
        : 'billiard';
      const statRef = ref(db, `dailyStats/${todayKey}/${cat}`);
      runTransaction(statRef, cur => (cur || 0) + totalMs);
      setSelectedItem(null);
      setHours(0);
      setMinutes(0);
    } catch (e) {
      console.error(e);
      addLog(`Ошибка бронирования ${selectedItem}: ${e.message}`);
    }
  };

  const resetBooking = async () => {
    if (!selectedItem) return;
    clearTimeout(timersRef.current[selectedItem]);
    delete timersRef.current[selectedItem];
    try {
      await update(ref(db, 'statuses'), { [selectedItem]: { status: 'Свободно', until: null } });
      addLog(`Сброс брони ${selectedItem}`);
      setSelectedItem(null);
      setHours(0);
      setMinutes(0);
    } catch (e) {
      console.error(e);
      addLog(`Ошибка сброса брони ${selectedItem}: ${e.message}`);
    }
  };

  return (
    <div className="admin-panel">
      <button onClick={downloadLog}>Скачать статистику</button>
      <div className="stats-display">
        <p>Дата: {todayKey}</p>
        <p>
          VR: {`${Math.floor(dailyStats.vr / 3600000)} ч ${Math.floor(
            (dailyStats.vr % 3600000) / 60000
          )} мин`}
        </p>
        <p>
          PlayStation: {`${Math.floor(dailyStats.ps / 3600000)} ч ${Math.floor(
            (dailyStats.ps % 3600000) / 60000
          )} мин`}
        </p>
        <p>
          Бильярд: {`${Math.floor(dailyStats.billiard / 3600000)} ч ${Math.floor(
            (dailyStats.billiard % 3600000) / 60000
          )} мин`}
        </p>
      </div>

      <div className="booking">
        <h3 className="booking-name">Новые бронирования</h3>
        <ul className="booking-list">
          {bookingsList.map(b => (
            <li key={b.id} className="booking-item">
              <span>
                <strong>{b.name}</strong> — {b.service} на {b.date} в {b.time} к-во мест:{' '}
                {b.quantity} Телефон {b.phone}
              </span>
              <button className="delete-btn" onClick={() => deleteBooking(b.id)}>
                Удалить
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-plates">
        {Object.entries(statuses).map(([key, val]) => (
          <div
            key={key}
            className={`admin-box ${val.status === 'Занято' ? 'busy' : 'free'}`}
            onClick={() => setSelectedItem(key)}
          >
            <strong>{key.toUpperCase()}</strong>
            <div>
              {val.status}
              {val.until && <small> до {new Date(val.until).toLocaleTimeString()}</small>}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="popup">
          {statuses[selectedItem].status === 'Занято' ? (
            <>
              <h3>
                {selectedItem.toUpperCase()} занят до{' '}
                {new Date(statuses[selectedItem].until).toLocaleTimeString()}
              </h3>
              <button onClick={resetBooking}>Сбросить</button>
              <button onClick={() => setSelectedItem(null)}>Закрыть</button>
            </>
          ) : (
            <>
              <h3>Забронировать {selectedItem.toUpperCase()}</h3>
              <label>
                Часы:{' '}
                <input
                  type="number"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  min={0}
                  max={12}
                />
              </label>
              <label>
                Минуты:{' '}
                <input
                  type="number"
                  value={minutes}
                  onChange={e => setMinutes(Number(e.target.value))}
                  min={0}
                  max={59}
                  step={15}
                />
              </label>
              <button onClick={confirmBooking}>Подтвердить</button>
              <button onClick={() => setSelectedItem(null)}>Отмена</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
