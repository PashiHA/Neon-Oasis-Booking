import React, { useEffect, useState, useRef } from 'react';
import './Admin.css';
import { db } from '../firebase';
import { ref, update, onValue, runTransaction, remove, onChildAdded } from 'firebase/database';

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

  // Add entry to history log
  const addLog = entry => setLogs(prev => [...prev, `${new Date().toLocaleString()}: ${entry}`]);

  // 1) Load statuses and set auto-reset timers per item
  useEffect(() => {
    const statusesRef = ref(db, 'statuses');
    const unsub = onValue(statusesRef, snap => {
      const data = snap.val() || {};
      const merged = { ...initialStatuses, ...data };
      setStatuses(merged);
      // clear existing timers
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
      // schedule per-item reset
      Object.entries(merged).forEach(([key, { status, until }]) => {
        if (status === 'Занято' && until) {
          const timeLeft = until - Date.now();
          if (timeLeft <= 0) {
            resetStatus(key);
          } else {
            timersRef.current[key] = setTimeout(() => {
              resetStatus(key);
              delete timersRef.current[key];
            }, timeLeft);
          }
        }
      });
    });
    return () => {
      unsub();
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  // 2) Load today's aggregated stats
  useEffect(() => {
    const todayKey = getTodayKey();
    const statsRef = ref(db, `dailyStats/${todayKey}`);
    const unsub = onValue(statsRef, snap => {
      const data = snap.val() || {};
      setDailyStats({ vr: 0, ps: 0, billiard: 0, ...data });
    });
    return () => unsub();
  }, []);

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
    } catch (e) {
      console.error(e);
    }
  };

  const downloadLog = () => {
    const todayKey = getTodayKey();
    const format = ms => `${Math.floor(ms/3600000)} ч ${Math.floor((ms%3600000)/60000)} мин`;
    const historyHeader = ['=== История бронирований ==='];
    const summaryHeader = ['','=== Итоги за день ===', `Дата: ${todayKey}`, `VR: ${format(dailyStats.vr)}`, `PlayStation: ${format(dailyStats.ps)}`, `Бильярд: ${format(dailyStats.billiard)}`];
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
    await remove(ref(db, `bookings/${id}`));
  };

  const confirmBooking = async () => {
    if (!selectedItem) return;
    const totalMs = hours * 3600000 + minutes * 60000;
    if (totalMs <= 0) return;
    const until = Date.now() + totalMs;
    try {
      await update(ref(db, 'statuses'), { [selectedItem]: { status: 'Занято', until } });
      addLog(`Забронировано ${selectedItem} на ${hours} ч ${minutes} мин`);
      const cat = selectedItem.startsWith('vr') ? 'vr' : selectedItem.startsWith('ps') ? 'ps' : 'billiard';
      const todayKey = getTodayKey();
      const statRef = ref(db, `dailyStats/${todayKey}/${cat}`);
      runTransaction(statRef, cur => (cur || 0) + totalMs);
      setSelectedItem(null);
      setHours(0);
      setMinutes(0);
    } catch (e) {
      console.error(e);
      addLog(`Booking error ${selectedItem}: ${e.message}`);
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
      addLog(`Reset error ${selectedItem}: ${e.message}`);
    }
  };

  return (
    <div className="admin-panel">
      <button onClick={downloadLog}>Скачать статистику</button>
      <div className="stats-display">
        <p>Дата: {getTodayKey()}</p>
        <p>VR: {`${Math.floor(dailyStats.vr/3600000)} ч ${Math.floor((dailyStats.vr%3600000)/60000)} мин`}</p>
        <p>PlayStation: {`${Math.floor(dailyStats.ps/3600000)} ч ${Math.floor((dailyStats.ps%3600000)/60000)} мин`}</p>
        <p>Бильярд: {`${Math.floor(dailyStats.billiard/3600000)} ч ${Math.floor((dailyStats.billiard%3600000)/60000)} мин`}</p>
      </div>
    <div className='booking'>
      <h3 className='booking-name'>Новые бронирования</h3>
      <ul className="booking-list">
        {bookingsList.map(b => (
          <li key={b.id} className="booking-item">
            <span><strong>{b.name}</strong> — {b.service} на {b.date} в {b.time} к-во мест: {b.quantity} Телефон {b.phone}</span>
            <button className="delete-btn" onClick={() => deleteBooking(b.id)}>Удалить</button>
          </li>
        ))}
      </ul>
      </div>

      <div className="admin-plates">
        {Object.entries(statuses).map(([key, val]) => (
          <div key={key} className={`admin-box ${val.status==='Занято'? 'busy':'free'}`} onClick={()=>setSelectedItem(key)}>
            <strong>{key.toUpperCase()}</strong>
            <div>{val.status}{val.until && <small> до {new Date(val.until).toLocaleTimeString()}</small>}</div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="popup">
          {statuses[selectedItem].status==='Занято' ? (
            <>
              <h3>{selectedItem.toUpperCase()} занят до {new Date(statuses[selectedItem].until).toLocaleTimeString()}</h3>
              <button onClick={resetBooking}>Сбросить</button>
              <button onClick={()=>setSelectedItem(null)}>Закрыть</button>
            </>
          ) : (
            <>
              <h3>Забронировать {selectedItem.toUpperCase()}</h3>
              <label>Часы: <input type="number" value={hours} onChange={e=>setHours(Number(e.target.value))} min={0} max={12} /></label>
              <label>Минуты: <input type="number" value={minutes} onChange={e=>setMinutes(Number(e.target.value))} min={0} max={59} step={15} /></label>
              <button onClick={confirmBooking}>Подтвердить</button>
              <button onClick={()=>setSelectedItem(null)}>Отмена</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
