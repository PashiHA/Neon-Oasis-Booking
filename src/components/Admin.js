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
  const [duration, setDuration] = useState(1);
  const [logs, setLogs] = useState([]);
  const timersRef = useRef({});

  useEffect(() => {
    const statusesRef = ref(db, 'statuses');
    const unsubscribe = onValue(statusesRef, snapshot => {
      const data = snapshot.val() || {};
      const merged = { ...initialStatuses, ...data };
      setStatuses(merged);
      const missingKeys = Object.keys(initialStatuses).filter(key => !(key in data));
      if (missingKeys.length) {
        const seedObj = {};
        missingKeys.forEach(key => { seedObj[key] = initialStatuses[key]; });
        update(statusesRef, seedObj);
      }
    });
    return () => unsubscribe();
  }, []);

  const addLog = entry => {
    setLogs(prev => [...prev, `${new Date().toLocaleString()}: ${entry}`]);
  };

  const downloadLog = () => {
    const content = logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings-log.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToFhir = async (key, { status, until }) => {
    const resource = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: key },
      effectiveDateTime: new Date().toISOString(),
      component: [
        { code: { text: 'status' }, valueString: status },
        { code: { text: 'until' }, valueInstant: until ? new Date(until).toISOString() : null }
      ]
    };
    try {
      await axios.post(
        `${FHIR_BASE}/Observation`,
        resource,
        { headers: { 'Content-Type': 'application/fhir+json' } }
      );
      addLog(`Отправлено в FHIR: ${key} -> ${status} до ${until ? new Date(until).toLocaleTimeString() : 'null'}`);
    } catch (err) {
      console.error('Ошибка при отправке в FHIR:', err);
      addLog(`Ошибка отправки в FHIR для ${key}: ${err.message}`);
    }
  };

  const confirmBooking = async () => {
    if (!selectedItem || duration < 0.5) return;
    const until = Date.now() + duration * 60 * 60 * 1000;
    const newStatus = { status: 'Занято', until };
    const statusesRef = ref(db, 'statuses');

    try {
      await update(statusesRef, { [selectedItem]: newStatus });
      setStatuses(prev => ({ ...prev, [selectedItem]: newStatus }));
      addLog(`Забронировано ${selectedItem} до ${new Date(until).toLocaleTimeString()}`);
      await sendToFhir(selectedItem, newStatus);

      const timeoutId = setTimeout(async () => {
        const freeStatus = { status: 'Свободно', until: null };
        await update(statusesRef, { [selectedItem]: freeStatus });
        setStatuses(prev => ({ ...prev, [selectedItem]: freeStatus }));
        addLog(`Авто-сброс ${selectedItem}`);
        await sendToFhir(selectedItem, freeStatus);
        delete timersRef.current[selectedItem];
      }, duration * 60 * 60 * 1000);
      timersRef.current[selectedItem] = timeoutId;

      setSelectedItem(null);
      setDuration(1);
    } catch (error) {
      console.error('Ошибка установки статуса:', error);
      addLog(`Ошибка бронирования ${selectedItem}: ${error.message}`);
    }
  };

  const resetBooking = async () => {
    const key = selectedItem;
    if (!key) return;
    clearTimeout(timersRef.current[key]);
    delete timersRef.current[key];

    const freeStatus = { status: 'Свободно', until: null };
    const statusesRef = ref(db, 'statuses');

    try {
      await update(statusesRef, { [key]: freeStatus });
      setStatuses(prev => ({ ...prev, [key]: freeStatus }));
      addLog(`Сброшено ${key}`);
      await sendToFhir(key, freeStatus);
    } catch (err) {
      console.error('Ошибка сброса брони:', err);
      addLog(`Ошибка сброса ${key}: ${err.message}`);
    } finally {
      setSelectedItem(null);
      setDuration(1);
    }
  };

  return (
    <div className="admin-panel">
      <button className="download-log" onClick={downloadLog} disabled={logs.length === 0}>
        Скачать лог бронирований
      </button>

      {Object.entries(statuses).map(([key, val]) => (
        <div
          key={key}
          className={`admin-box ${val.status === 'Занято' ? 'busy' : 'free'}`}
          onClick={() => setSelectedItem(key)}
        >
          <strong>{key.toUpperCase()}</strong>
          <div>
            {val.status}
            {val.until && (
              <small> до {new Date(val.until).toLocaleTimeString()}</small>
            )}
          </div>
        </div>
      ))}

      {selectedItem && (
        <div className="popup">
          {statuses[selectedItem].status === 'Занято' ? (
            <>
              <h3>{selectedItem.toUpperCase()} занят до {new Date(statuses[selectedItem].until).toLocaleTimeString()}</h3>
              <button onClick={resetBooking}>Сбросить бронирование</button>
              <button onClick={() => setSelectedItem(null)}>Закрыть</button>
            </>
          ) : (
            <>
              <h3>Забронировать {selectedItem.toUpperCase()}</h3>
              <label>
                Длительность (часы, шаг 0.5):
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  min={0.5}
                  max={12}
                  step={0.5}
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
