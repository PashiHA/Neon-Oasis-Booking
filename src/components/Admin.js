import React, { useEffect, useState, useRef } from 'react';
import './Admin.css';
import axios from 'axios';
import { db } from '../firebase';
import { ref, update, onValue } from 'firebase/database';

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

const FHIR_BASE = process.env.REACT_APP_FHIR_BASE_URL;

export default function Admin() {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [logs, setLogs] = useState([]);
  const timersRef = useRef({});

  // Загрузка статусов и установка таймеров на авто-сброс
  useEffect(() => {
    const statusesRef = ref(db, 'statuses');
    const unsubscribe = onValue(statusesRef, snapshot => {
      const data = snapshot.val() || {};
      const merged = { ...initialStatuses, ...data };
      setStatuses(merged);
      // инициализация недостающих ключей
      const missing = Object.keys(initialStatuses).filter(k => !(k in data));
      if (missing.length) {
        const seed = {};
        missing.forEach(k => { seed[k] = initialStatuses[k]; });
        update(statusesRef, seed);
      }
    });
    return () => {
      unsubscribe();
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    Object.entries(statuses).forEach(([key, { status, until }]) => {
      if (status === 'Занято' && until) {
        const timeLeft = until - Date.now();
        if (timeLeft <= 0) {
          resetStatus(key);
        } else if (!timersRef.current[key]) {
          timersRef.current[key] = setTimeout(() => {
            resetStatus(key);
            delete timersRef.current[key];
          }, timeLeft);
        }
      }
    });
  }, [statuses]);

  const addLog = entry => setLogs(prev => [...prev, `${new Date().toLocaleString()}: ${entry}`]);

  const downloadLog = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'bookings-log.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const sendToFhir = async (key, { status, until }) => {
    const resource = {
      resourceType: 'Observation', status: 'final', code: { text: key },
      effectiveDateTime: new Date().toISOString(),
      component: [
        { code: { text: 'status' }, valueString: status },
        { code: { text: 'until' }, valueInstant: until ? new Date(until).toISOString() : null }
      ]
    };
    try {
      await axios.post(`${FHIR_BASE}/Observation`, resource, { headers: { 'Content-Type': 'application/fhir+json' } });
      addLog(`FHIR: ${key} -> ${status}${until? ` до ${new Date(until).toLocaleTimeString()}` : ''}`);
    } catch (e) {
      console.error(e);
      addLog(`FHIR error ${key}: ${e.message}`);
    }
  };

  const resetStatus = async key => {
    const free = { status: 'Свободно', until: null };
    const statusesRef = ref(db, 'statuses');
    try {
      await update(statusesRef, { [key]: free });
      setStatuses(prev => ({ ...prev, [key]: free }));
      addLog(`Авто-сброс ${key}`);
      await sendToFhir(key, free);
    } catch (e) {
      console.error(e);
      addLog(`Reset error ${key}: ${e.message}`);
    }
  };

  const confirmBooking = async () => {
    if (!selectedItem) return;
    const totalMs = hours * 3600000 + minutes * 60000;
    if (totalMs <= 0) return;
    const until = Date.now() + totalMs;
    const newStatus = { status: 'Занято', until };
    const statusesRef = ref(db, 'statuses');
    try {
      await update(statusesRef, { [selectedItem]: newStatus });
      addLog(`Забронировано ${selectedItem} на ${hours} ч ${minutes} мин`);
      await sendToFhir(selectedItem, newStatus);
      setSelectedItem(null);
      setHours(0); setMinutes(30);
    } catch (e) {
      console.error(e);
      addLog(`Booking error ${selectedItem}: ${e.message}`);
    }
  };

  const resetBooking = async () => {
    if (!selectedItem) return;
    clearTimeout(timersRef.current[selectedItem]);
    delete timersRef.current[selectedItem];
    await resetStatus(selectedItem);
    setSelectedItem(null);
    setHours(0); setMinutes(30);
  };

  return (
    <div className="admin-panel">
      <button onClick={downloadLog} disabled={!logs.length}>Скачать лог</button>
      {Object.entries(statuses).map(([key, val]) => (
        <div key={key} className={`admin-box ${val.status==='Занято'? 'busy':'free'}`} onClick={()=>setSelectedItem(key)}>
          <strong>{key.toUpperCase()}</strong>
          <div>{val.status}{val.until && <small> до {new Date(val.until).toLocaleTimeString()}</small>}</div>
        </div>
      ))}
      {selectedItem && (
        <div className="popup">
          {statuses[selectedItem].status==='Занято' ? (
            <><h3>{selectedItem.toUpperCase()} занят до {new Date(statuses[selectedItem].until).toLocaleTimeString()}</h3>
            <button onClick={resetBooking}>Сбросить</button><button onClick={()=>setSelectedItem(null)}>Закрыть</button></>
          ) : (
            <><h3>Забронировать {selectedItem.toUpperCase()}</h3>
            <label>Часы: <input type="number" value={hours} onChange={e=>setHours(Number(e.target.value))} min={0} max={12} /></label>
            <label>Минуты: <input type="number" value={minutes} onChange={e=>setMinutes(Number(e.target.value))} min={0} max={59} step={15} /></label>
            <button onClick={confirmBooking}>Подтвердить</button><button onClick={()=>setSelectedItem(null)}>Отмена</button></>
          )}
        </div>
      )}
    </div>
  );
}
