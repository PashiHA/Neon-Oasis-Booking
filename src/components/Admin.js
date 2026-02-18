// src/components/Admin.js — fixed bookings(cancelled) + fixed drinks stock logic (atomic batch TX)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Admin.css';
import { db } from '../firebase';
import {
  ref,
  onValue,
  runTransaction,
  remove,
  onChildAdded,
  push,
  serverTimestamp
} from 'firebase/database';
import CalendarBookings from './CalendarBookings';

// -------------------- Helpers --------------------
const INITIAL_STATUSES = {
  vr1: { status: 'Свободно', until: null },
  vr2: { status: 'Свободно', until: null },
  vr3: { status: 'Свободно', until: null },
  vr4: { status: 'Свободно', until: null },
  ps1: { status: 'Свободно', until: null },
  ps2: { status: 'Свободно', until: null },
  billiard1: { status: 'Свободно', until: null },
  billiard2: { status: 'Свободно', until: null },
  autosim1: { status: 'Свободно', until: null },
  autosim2: { status: 'Свободно', until: null }
};

// Каталог напитков и цены (MDL)
const DRINKS = {
  cola_05: { name: 'Coca-Cola 0.5 l', price: 16 },
  fanta_05: { name: 'Fanta 0.5 l', price: 16 },
  sprite_05: { name: 'Sprite 0.5 l', price: 16 },
  schweppes_033: { name: 'Schweppes 0.33 l', price: 16 },
  dorna_05: { name: 'Dorna 0.5 l', price: 14 },
  frunzea_05: { name: 'Ceai Frunzea 0.5 l', price: 20 },
  cappy_02: { name: 'Cappy 0.2 l', price: 13 },
  monster_05: { name: 'Monster 0.5 l', price: 30 },
  burn_0250: { name: 'Burn 0.25 l', price: 25 },
  cola_033: { name: 'Coca-Cola 0.33 l', price: 13 },
  fanta_033: { name: 'Fanta 0.33 l', price: 13 },
  sprite_033: { name: 'Sprite 0.33 l', price: 13 },
};
const DRINK_KEYS = Object.keys(DRINKS);

const getLocalDayKeyFromTs = (ts) => {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const serviceCategory = (key) =>
  key.startsWith('vr') ? 'vr'
    : key.startsWith('ps') ? 'ps'
      : key.startsWith('billiard') ? 'billiard'
        : (key.startsWith('sim') || key.startsWith('autosim')) ? 'sim'
          : 'other';

const isCancelledBooking = (b) => String(b?.status || '').toLowerCase() === 'cancelled';

// -------------------- Component --------------------
export default function Admin() {
  // UI state
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [dailyStats, setDailyStats] = useState({ vr: 0, ps: 0, billiard: 0, sim: 0, revenueMDL: 0 });

  // bookings: храним все + отдельно видимые (без cancelled)
  const [bookingsAll, setBookingsAll] = useState([]);
  const [logs, setLogs] = useState([]);

  // Напитки: склад + корзины
  const [drinkStock, setDrinkStock] = useState({}); // { sku: number }
  const [shipmentCart, setShipmentCart] = useState({}); // { sku: qty }
  const [saleCart, setSaleCart] = useState({}); // { sku: qty }
  const [uiMsg, setUiMsg] = useState('');

  // Collapsible panels visibility
  const [showShipment, setShowShipment] = useState(false);
  const [showSale, setShowSale] = useState(false);

  // Server time offset
  const [serverOffset, setServerOffset] = useState(0);
  const serverNow = useMemo(() => () => Date.now() + serverOffset, [serverOffset]);

  // Day key derived from server time, auto-updates
  const [todayKey, setTodayKey] = useState(() => getLocalDayKeyFromTs(Date.now()));

  // -------------------- server offset --------------------
  useEffect(() => {
    const offRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offRef, (snap) => setServerOffset(snap.val() || 0));
    return () => unsub();
  }, []);

  useEffect(() => {
    const tick = () => setTodayKey(getLocalDayKeyFromTs(serverNow()));
    const id = setInterval(tick, 60_000);
    tick();
    return () => clearInterval(id);
  }, [serverNow]);

  // -------------------- Logging --------------------
  const addLog = async (entry, ts = serverNow()) => {
    const dayKey = getLocalDayKeyFromTs(ts);
    const logRef = ref(db, `logs/${dayKey}`);
    return push(logRef, { timestamp: ts, entry });
  };

  useEffect(() => {
    const logRef = ref(db, `logs/${todayKey}`);
    const unsub = onValue(logRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.values(data)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((item) => `${new Date(item.timestamp).toLocaleString()}: ${item.entry}`);
      setLogs(list);
    });
    return () => unsub();
  }, [todayKey]);

  // -------------------- Statuses subscribe + audit --------------------
  const prevStatusesRef = useRef(INITIAL_STATUSES);

  useEffect(() => {
    const statusesRef = ref(db, 'statuses');

    const unsub = onValue(statusesRef, (snap) => {
      const data = snap.val() || {};
      const merged = { ...INITIAL_STATUSES, ...data };

      // Audit unexpected resets
      const nowTs = serverNow();
      const prev = prevStatusesRef.current || {};
      Object.entries(merged).forEach(([k, v]) => {
        const p = prev[k] || {};
        if (p.status === 'Занято' && v.status === 'Свободно' && (p.until || 0) > nowTs + 2000) {
          if (!v.reason && !v.updatedBy) {
            addLog(`⚠️ Неожиданный сброс ${k} (раньше срока). Возможен внешний клиент/другая вкладка.`);
          }
        }
      });

      prevStatusesRef.current = merged;
      setStatuses(merged);
    });

    return () => unsub();
  }, [serverNow]);

  // -------------------- Daily stats subscribe --------------------
  useEffect(() => {
    const statsRef = ref(db, `dailyStats/${todayKey}`);
    const unsub = onValue(statsRef, (snap) => {
      const data = snap.val() || {};
      setDailyStats({ vr: 0, ps: 0, billiard: 0, sim: 0, revenueMDL: 0, ...data });
    });
    return () => unsub();
  }, [todayKey]);

  // -------------------- Bookings: subscribe --------------------
  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');

    // список — берём ВСЕ, но ниже в UI показываем без cancelled
    const unsubList = onValue(bookingsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, entry]) => ({ id, ...entry }));
      setBookingsAll(list);
    });

    // логируем только реальные новые брони, не cancelled
    const unsubChild = onChildAdded(bookingsRef, (snap) => {
      const b = snap.val();
      if (!b) return;
      if (isCancelledBooking(b)) return;
      addLog(`Новое бронирование: ${b.name}, ${b.service}, ${b.date} в ${b.time}`);
    });

    return () => {
      unsubList();
      unsubChild();
    };
  }, []);

  // ✅ показываем в админке/календаре только активные (не cancelled)
  const bookingsVisible = useMemo(
    () => bookingsAll.filter((b) => !isCancelledBooking(b)),
    [bookingsAll]
  );

  // -------------------- Drinks: stock subscribe --------------------
  useEffect(() => {
    const sRef = ref(db, 'drinks/stock');
    const unsub = onValue(sRef, (snap) => {
      const data = snap.val() || {};
      setDrinkStock(data);
    });
    return () => unsub();
  }, []);

  // -------------------- Status TX helpers --------------------
  const newLeaseId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  const resetStatusTx = async (key, reason = 'system-auto') => {
    try {
      const res = await runTransaction(ref(db, `statuses/${key}`), (cur) => {
        const curr = cur || { status: 'Свободно', until: null };
        const isExpired = (curr.until || 0) <= serverNow();
        if (curr.status === 'Занято' && (isExpired || reason === 'manual-reset')) {
          return {
            status: 'Свободно',
            until: null,
            leaseId: null,
            updatedBy: reason === 'manual-reset' ? 'admin' : 'system',
            reason,
            updatedAt: serverTimestamp()
          };
        }
        return curr;
      });

      const after = res?.snapshot?.val();
      if (res?.committed && after?.status === 'Свободно') {
        addLog(`Сброс ${key} — статус «Свободно» (${reason})`);
      }
    } catch (e) {
      console.error(e);
      addLog(`Ошибка сброса ${key}: ${e.message}`);
    }
  };

  const confirmBooking = async () => {
    if (!selectedItem) return;
    const totalMs = (Number(hours) || 0) * 3_600_000 + (Number(minutes) || 0) * 60_000;
    if (totalMs <= 0) return;

    const until = serverNow() + totalMs;
    const leaseId = newLeaseId();

    try {
      const res = await runTransaction(ref(db, `statuses/${selectedItem}`), (cur) => {
        const curr = cur || { status: 'Свободно', until: null };
        const expired = (curr.until || 0) <= serverNow();
        if (curr.status === 'Свободно' || expired) {
          return {
            status: 'Занято',
            until,
            leaseId,
            updatedBy: 'admin',
            reason: 'manual-booking',
            updatedAt: serverTimestamp()
          };
        }
        return curr;
      });

      const committed = res?.committed;
      const after = res?.snapshot?.val();

      if (committed && after?.status === 'Занято' && after?.leaseId === leaseId) {
        addLog(`Бронирование ${selectedItem}: ${hours} ч ${minutes} мин`);
        const cat = serviceCategory(selectedItem);
        await runTransaction(ref(db, `dailyStats/${todayKey}/${cat}`), (cur) => (cur || 0) + totalMs);
        setSelectedItem(null);
        setHours(0);
        setMinutes(30);
      } else {
        addLog(`Не удалось забронировать ${selectedItem}: уже занято`);
      }
    } catch (e) {
      console.error(e);
      addLog(`Ошибка бронирования ${selectedItem}: ${e.message}`);
    }
  };

  const deleteBooking = async (id) => {
    try {
      await remove(ref(db, `bookings/${id}`));
      addLog(`Удалено бронирование ID=${id}`);
    } catch (e) {
      console.error(e);
      addLog(`Ошибка удаления брони ID=${id}: ${e.message}`);
    }
  };

  const resetBooking = async () => {
    if (!selectedItem) return;
    await resetStatusTx(selectedItem, 'manual-reset');
    setSelectedItem(null);
    setHours(0);
    setMinutes(30);
  };

  // -------------------- Drinks helpers (stable carts) --------------------
  const setCartQty = (setter) => (sku, qty) => {
    const q = Math.max(0, Math.floor(Number(qty) || 0));
    setter((prev) => {
      const next = { ...prev };
      if (q === 0) delete next[sku];
      else next[sku] = q;
      return next;
    });
  };

  const incCart = (setter) => (sku, step = 1) => {
    setter((prev) => {
      const cur = Number(prev[sku] || 0);
      const nextQty = Math.max(0, cur + step);
      const next = { ...prev };
      if (nextQty === 0) delete next[sku];
      else next[sku] = nextQty;
      return next;
    });
  };

  const decCart = (setter) => (sku, step = 1) => {
    setter((prev) => {
      const cur = Number(prev[sku] || 0);
      const nextQty = Math.max(0, cur - step);
      const next = { ...prev };
      if (nextQty === 0) delete next[sku];
      else next[sku] = nextQty;
      return next;
    });
  };

  const shipmentCount = useMemo(() => Object.values(shipmentCart).reduce((a, b) => a + b, 0), [shipmentCart]);
  const saleCount = useMemo(() => Object.values(saleCart).reduce((a, b) => a + b, 0), [saleCart]);

  const saleTotal = useMemo(() => {
    return Object.entries(saleCart).reduce((sum, [sku, qty]) => sum + ((DRINKS[sku]?.price || 0) * qty), 0);
  }, [saleCart]);

  const saleInsufficient = useMemo(() => {
    return Object.entries(saleCart).some(([sku, qty]) => (Number(drinkStock?.[sku] || 0) < qty));
  }, [saleCart, drinkStock]);

  // ✅ Атомарная батч-транзакция по всему складу (all-or-nothing)
  // deltaMap: { sku: +qty } или { sku: -qty }
  const batchAdjustStockTx = async (deltaMap) => {
    const stockRef = ref(db, 'drinks/stock');
    try {
      const res = await runTransaction(stockRef, (cur) => {
        const currentStock = cur && typeof cur === 'object' ? { ...cur } : {};

        // сначала считаем "предварительно"
        for (const [sku, delta] of Object.entries(deltaMap)) {
          const curQty = Number(currentStock[sku] || 0);
          const nextQty = curQty + Number(delta || 0);
          if (nextQty < 0) return; // abort
          currentStock[sku] = nextQty;
        }

        return currentStock;
      });

      return { ok: !!res?.committed, stock: res?.snapshot?.val() || {} };
    } catch (e) {
      console.error(e);
      return { ok: false, error: e };
    }
  };

  const addShipmentAll = async () => {
    const entries = Object.entries(shipmentCart).filter(([, q]) => q > 0);
    if (!entries.length) return;

    setUiMsg('');
    try {
      // deltaMap для поступления
      const deltaMap = Object.fromEntries(entries.map(([sku, qty]) => [sku, +qty]));
      const tx = await batchAdjustStockTx(deltaMap);

      if (!tx.ok) {
        setUiMsg('Ошибка: поступление не применено (конфликт/ошибка транзакции).');
        return;
      }

      // Логи после успешной транзакции
      for (const [sku, qty] of entries) {
        const drink = DRINKS[sku];
        const remaining = Number(tx.stock?.[sku] || 0);
        await addLog(`Поступление напитков: ${drink.name} × ${qty} (остаток: ${remaining})`);
      }

      setShipmentCart({});
      setShowShipment(false);
      setUiMsg(`Поступление добавлено: ${entries.length} поз., всего ${entries.reduce((s,[,q])=>s+q,0)} шт.`);
    } catch (e) {
      console.error(e);
      setUiMsg('Ошибка при добавлении поступления');
    }
  };

  const sellAll = async () => {
    const entries = Object.entries(saleCart).filter(([, q]) => q > 0);
    if (!entries.length) return;

    setUiMsg('');

    // Быстрая пред-проверка (UI)
    if (entries.some(([sku, qty]) => (Number(drinkStock?.[sku] || 0) < qty))) {
      setUiMsg('Недостаточно на складе для выбранных позиций');
      return;
    }

    try {
      const totalSum = entries.reduce((s, [sku, qty]) => s + ((DRINKS[sku]?.price || 0) * qty), 0);

      // deltaMap для продажи (минус)
      const deltaMap = Object.fromEntries(entries.map(([sku, qty]) => [sku, -qty]));
      const tx = await batchAdjustStockTx(deltaMap);

      if (!tx.ok) {
        setUiMsg('Продажа не применена (конфликт: кто-то уже купил/остаток изменился). Попробуй ещё раз.');
        return;
      }

      // Запись продаж и логов (после успешного списания)
      for (const [sku, qty] of entries) {
        const drink = DRINKS[sku];
        const remaining = Number(tx.stock?.[sku] || 0);

        await push(ref(db, `sales/${todayKey}/drinks`), {
          ts: serverNow(),
          sku,
          name: drink.name,
          qty,
          price: drink.price,
          total: drink.price * qty
        });

        await addLog(`Продажа: ${drink.name} × ${qty} = ${drink.price * qty} MDL (остаток: ${remaining})`);
      }

      // Выручка
      await runTransaction(ref(db, `dailyStats/${todayKey}/revenueMDL`), (cur) => (cur || 0) + totalSum);

      setSaleCart({});
      setShowSale(false);
      setUiMsg(`Продано: ${entries.length} поз. / ${entries.reduce((s,[,q])=>s+q,0)} шт. На сумму ${totalSum} MDL`);
    } catch (e) {
      console.error(e);
      setUiMsg('Ошибка при продаже');
    }
  };

  // -------------------- Sweeper: check expired statuses --------------------
  useEffect(() => {
    const id = setInterval(() => {
      Object.entries(statuses).forEach(([key, val]) => {
        if (val?.status === 'Занято' && (val?.until || 0) <= serverNow()) {
          resetStatusTx(key, 'sweeper');
        }
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [statuses, serverNow]);

  // -------------------- Download log --------------------
  const downloadLog = () => {
    const format = (ms) => `${Math.floor(ms / 3_600_000)} ч ${Math.floor((ms % 3_600_000) / 60_000)} мин`;
    const historyHeader = ['=== История событий ==='];
    const summaryHeader = [
      '',
      '=== Итоги за день ===',
      `Дата: ${todayKey}`,
      `VR: ${format(dailyStats.vr)}`,
      `PlayStation: ${format(dailyStats.ps)}`,
      `Бильярд: ${format(dailyStats.billiard)}`,
      `Автосимулятор: ${format(dailyStats.sim)}`,
      `Выручка (напитки): ${Number(dailyStats.revenueMDL || 0).toFixed(2)} MDL`
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

  // -------------------- Render --------------------
  return (
    <div className="admin-panel">
      <button className='button-log' onClick={downloadLog}>Скачать статистику</button>

      <div className="row row-top">
        <div className="stats-display">
          <p>Дата: {todayKey}</p>
          <p>VR: {`${Math.floor(dailyStats.vr / 3_600_000)} ч ${Math.floor((dailyStats.vr % 3_600_000) / 60_000)} мин`}</p>
          <p>PlayStation: {`${Math.floor(dailyStats.ps / 3_600_000)} ч ${Math.floor((dailyStats.ps % 3_600_000) / 60_000)} мин`}</p>
          <p>Бильярд: {`${Math.floor(dailyStats.billiard / 3_600_000)} ч ${Math.floor((dailyStats.billiard % 3_600_000) / 60_000)} мин`}</p>
          <p>Автосимулятор: {`${Math.floor(dailyStats.sim / 3_600_000)} ч ${Math.floor((dailyStats.sim % 3_600_000) / 60_000)} мин`}</p>
          <p>Выручка (напитки): {Number(dailyStats.revenueMDL || 0).toFixed(2)} MDL</p>
        </div>

        {/* ✅ Календарь бронирований — передаём только не отменённые */}
        <CalendarBookings
          bookingsList={bookingsVisible}
          onDelete={deleteBooking}
        />
      </div>

      <div className="row row-bottom">
        {/* Плитки статусов */}
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

        {/* Попап бронирования */}
        {selectedItem && (
          <div className="popup">
            {statuses[selectedItem]?.status === 'Занято' ? (
              <>
                <h3>
                  {selectedItem.toUpperCase()} занят до {new Date(statuses[selectedItem].until).toLocaleTimeString()}
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
                    onChange={(e) => setHours(Math.max(0, Math.min(12, Number(e.target.value))))}
                    min={0}
                    max={12}
                  />
                </label>
                <label>
                  Минуты:{' '}
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
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

        {/* Напитки */}
        <div className="drinks-section">
          <h3>Напитки</h3>

          <div className="drinks-forms">
            {/* Поступление */}
            <div className={`form-block panel ${showShipment ? '' : 'collapsed'}`}>
              <div className="panel-head" onClick={() => setShowShipment((v) => !v)}>
                <h4>Поступление</h4>
                <button type="button" className="panel-toggle">{showShipment ? 'Свернуть' : 'Открыть'}</button>
              </div>

              <div className="panel-body">
                <ul className="drinks-list">
                  {DRINK_KEYS.map((sku) => {
                    const d = DRINKS[sku];
                    const stock = Number(drinkStock?.[sku] || 0);
                    const qty = shipmentCart[sku] || 0;

                    return (
                      <li
                        key={sku}
                        className={`drink-row ${qty > 0 ? 'selected' : ''}`}
                        onClick={() => incCart(setShipmentCart)(sku, 1)}
                      >
                        <span className="drink-name">{d.name}</span>
                        <span className="drink-price">{d.price} MDL</span>
                        <span className="drink-stock">На складе: {stock}</span>

                        <div className="qty-controls" onClick={(e) => e.stopPropagation()}>
                          <button className='qty-controls-button' onClick={() => decCart(setShipmentCart)(sku, 1)}>-</button>
                          <input
                            type="number"
                            min={0}
                            value={qty}
                            onChange={(e) => setCartQty(setShipmentCart)(sku, e.target.value)}
                          />
                          <button className='qty-controls-button' onClick={() => incCart(setShipmentCart)(sku, 1)}>+</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="sell-total">К добавлению: {shipmentCount} шт.</div>
                <button onClick={addShipmentAll} disabled={shipmentCount === 0}>Добавить поступление</button>
              </div>
            </div>

            {/* Продажа */}
            <div className={`form-block panel ${showSale ? '' : 'collapsed'}`}>
              <div className="panel-head" onClick={() => setShowSale((v) => !v)}>
                <h4>Продажа</h4>
                <button type="button" className="panel-toggle">{showSale ? 'Свернуть' : 'Открыть'}</button>
              </div>

              <div className="panel-body">
                <ul className="drinks-list">
                  {DRINK_KEYS.map((sku) => {
                    const d = DRINKS[sku];
                    const stock = Number(drinkStock?.[sku] || 0);
                    const qty = saleCart[sku] || 0;
                    const over = qty > stock;

                    return (
                      <li
                        key={sku}
                        className={`drink-row ${qty > 0 ? 'selected' : ''}`}
                        onClick={() => incCart(setSaleCart)(sku, 1)}
                      >
                        <span className="drink-name">{d.name}</span>
                        <span className="drink-price">{d.price} MDL</span>
                        <span className="drink-stock">На складе: {stock}</span>

                        <div className="qty-controls" onClick={(e) => e.stopPropagation()}>
                          <button className='qty-controls-button' onClick={() => decCart(setSaleCart)(sku, 1)}>-</button>
                          <input
                            type="number"
                            min={0}
                            value={qty}
                            onChange={(e) => setCartQty(setSaleCart)(sku, e.target.value)}
                          />
                          <button className='qty-controls-button' onClick={() => incCart(setSaleCart)(sku, 1)}>+</button>
                        </div>

                        {over && <small className="stock-info">Недостаточно на складе</small>}
                      </li>
                    );
                  })}
                </ul>

                <div className="sell-total">К оплате: {saleTotal.toFixed(2)} MDL</div>
                <button
                  onClick={sellAll}
                  disabled={saleCount === 0 || saleInsufficient}
                  title={saleInsufficient ? 'Недостаточно на складе' : undefined}
                >
                  Продать выбранное
                </button>
              </div>
            </div>
          </div>

          {uiMsg && <div className="ui-msg">{uiMsg}</div>}
        </div>
      </div>
    </div>
  );
}
