import React, { useMemo, useState, useEffect } from 'react';
import './CalendarBookings.css';

/* ================= Helpers ================= */
const toKey = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeDayKey = (dateStr) => {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;     // YYYY-MM-DD
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {                  // DD.MM.YYYY
    const [dd, mm, yyyy] = dateStr.split('.');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : toKey(d);
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const m = timeStr.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (!m) return null;
  const h = Math.max(0, Math.min(23, Number(m[1]) || 0));
  const mm = Math.max(0, Math.min(59, Number(m[2]) || 0));
  return h * 60 + mm;
};

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay() || 7;       // Mon=1..Sun=7
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (day - 1)); // к понедельнику
  return d;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// “24 авг”
const formatRuDayShort = (date) => {
  const s = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  return s.replace('.', '');
};

// localStorage utils
const readSetFromLS = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
};
const saveSetToLS = (key, set) => {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
};

// cancelled helper
const isCancelled = (b) => String(b?.status || '').toLowerCase() === 'cancelled';

/* ================= Constants ================= */
const LS_SEEN       = 'cb_seen_ids_v1';
const LS_UNREAD     = 'cb_unread_ids_v1';
const LS_INIT_SEEN  = 'cb_seen_initialized_v1';

/* ================= Component ================= */
function CalendarBookings({ bookingsList, onDelete }) {
  // ✅ Всегда работаем только с активными бронями (отменённые игнорируем)
  const activeBookings = useMemo(() => {
    return (bookingsList || []).filter(b => !isCancelled(b));
  }, [bookingsList]);

  /* ---- 1) Производные данные по списку ---- */
  const bookingsByDay = useMemo(() => {
    const map = {};
    activeBookings.forEach((b) => {
      const key = normalizeDayKey(b.date);
      if (!key) return;
      (map[key] ||= []).push(b);
    });
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => (parseTimeToMinutes(a.time) ?? 0) - (parseTimeToMinutes(b.time) ?? 0))
    );
    return map;
  }, [activeBookings]);

  const idToDayKey = useMemo(() => {
    const m = {};
    activeBookings.forEach(b => {
      const k = normalizeDayKey(b.date);
      if (b?.id && k) m[b.id] = k;
    });
    return m;
  }, [activeBookings]);

  /* ---- 2) Неделя/дни ---- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey = toKey(today);

  const [viewStart, setViewStart] = useState(() => startOfWeek(today));
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const isCurrentWeek = viewStart.getTime() === startOfWeek(today).getTime();

  const weekCells = useMemo(() => {
    const cells = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(viewStart, i);
      const key = toKey(d);
      return { date: d, key, cnt: (bookingsByDay[key]?.length || 0) };
    });
    return isCurrentWeek ? cells.filter(c => c.key >= todayKey) : cells;
  }, [viewStart, bookingsByDay, isCurrentWeek, todayKey]);

  const canGoPrev = useMemo(() => {
    const prevStart = addDays(viewStart, -7);
    const prevEndKey = toKey(addDays(prevStart, 6));
    return prevEndKey >= todayKey;
  }, [viewStart, todayKey]);

  const goPrev = () => {
    if (!canGoPrev) return;
    const nextStart = addDays(viewStart, -7);
    setViewStart(nextStart);
    setSelectedDayKey(toKey(nextStart));
  };
  const goNext = () => {
    const nextStart = addDays(viewStart, 7);
    setViewStart(nextStart);
    setSelectedDayKey(toKey(nextStart));
  };

  /* ---- 3) Таймлайн и выбранный день ---- */
  const timeline = useMemo(() => {
    const startMin = 12 * 60, endMin = 23 * 60 + 30;
    const arr = [];
    for (let m = startMin; m <= endMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      arr.push(`${hh}:${mm}`);
    }
    return arr;
  }, []);

  const dayBookings = bookingsByDay[selectedDayKey] || [];
  const timeMap = useMemo(() => {
    const m = {};
    dayBookings.forEach(b => {
      const t = b.time?.trim();
      if (!t) return;
      (m[t] ||= []).push(b);
    });
    return m;
  }, [dayBookings]);

  const [activeSlot, setActiveSlot] = useState(null);
  useEffect(() => { setActiveSlot(null); }, [selectedDayKey]);

  /* ---- 4) Непрочитанные/прочитанные (persist на устройстве) ---- */
  const [seenIds, setSeenIds]     = useState(() => readSetFromLS(LS_SEEN));
  const [unreadIds, setUnreadIds] = useState(() => readSetFromLS(LS_UNREAD));
  const [initDone, setInitDone]   = useState(() => localStorage.getItem(LS_INIT_SEEN) === '1');

  // Первая инициализация: всё текущее (активное) считаем прочитанным
  useEffect(() => {
    if (initDone) return;
    if (!activeBookings || activeBookings.length === 0) return;
    const all = new Set(activeBookings.map(b => b.id).filter(Boolean));
    setSeenIds(all);         saveSetToLS(LS_SEEN, all);
    const empty = new Set(); setUnreadIds(empty); saveSetToLS(LS_UNREAD, empty);
    localStorage.setItem(LS_INIT_SEEN, '1');
    setInitDone(true);
  }, [activeBookings, initDone]);

  // Новые активные брони -> в unread (если их id ещё не видели)
  useEffect(() => {
    if (!initDone) return;
    const curSeen = readSetFromLS(LS_SEEN);
    const curUnread = readSetFromLS(LS_UNREAD);

    activeBookings.forEach(b => {
      if (!b?.id) return;
      if (!curSeen.has(b.id) && !curUnread.has(b.id)) curUnread.add(b.id);
    });

    setUnreadIds(curUnread);
    saveSetToLS(LS_UNREAD, curUnread);
  }, [activeBookings, initDone]);

  // ✅ Чистим unread/seen, если бронь удалили ИЛИ отменили (теперь её нет в activeBookings)
  useEffect(() => {
    const present = new Set(activeBookings.map(b => b.id).filter(Boolean));

    const nextUnread = new Set([...unreadIds].filter(id => present.has(id)));
    if (nextUnread.size !== unreadIds.size) {
      setUnreadIds(nextUnread);
      saveSetToLS(LS_UNREAD, nextUnread);
    }

    const nextSeen = new Set([...seenIds].filter(id => present.has(id)));
    if (nextSeen.size !== seenIds.size) {
      setSeenIds(nextSeen);
      saveSetToLS(LS_SEEN, nextSeen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookings]); // намеренно от activeBookings

  /* ---- 4.1) По-слотные индикаторы ---- */
  const markSlotRead = (slot) => {
    const idsInSlot = (timeMap[slot] || []).map(b => b.id).filter(Boolean);
    if (!idsInSlot.length) return;

    const nextUnread = new Set(unreadIds);
    const nextSeen   = new Set(seenIds);
    idsInSlot.forEach(id => { nextUnread.delete(id); nextSeen.add(id); });

    setUnreadIds(nextUnread);  saveSetToLS(LS_UNREAD, nextUnread);
    setSeenIds(nextSeen);      saveSetToLS(LS_SEEN, nextSeen);
  };

  // Непрочитанные по слоту (только для выбранного дня)
  const unreadBySlot = useMemo(() => {
    const m = {};
    unreadIds.forEach(id => {
      const dayKey = idToDayKey[id];
      if (dayKey !== selectedDayKey) return;
      const booking = (bookingsByDay[dayKey] || []).find(b => b.id === id);
      if (booking?.time) m[booking.time] = (m[booking.time] || 0) + 1;
    });
    return m;
  }, [unreadIds, idToDayKey, bookingsByDay, selectedDayKey]);

  // Красные точки на стрелках (если непрочитанные вне текущей недели)
  const startKey = toKey(viewStart);
  const endKey   = toKey(addDays(viewStart, 6));

  const hasUnreadLeft = useMemo(() => {
    let flag = false;
    unreadIds.forEach(id => {
      const k = idToDayKey[id];
      if (k && k < startKey && k >= todayKey) flag = true;
    });
    return flag;
  }, [unreadIds, idToDayKey, startKey, todayKey]);

  const hasUnreadRight = useMemo(() => {
    let flag = false;
    unreadIds.forEach(id => {
      const k = idToDayKey[id];
      if (k && k > endKey) flag = true;
    });
    return flag;
  }, [unreadIds, idToDayKey, endKey]);

  // Подпись недели
  const weekLabel = useMemo(() => {
    const end = addDays(viewStart, 6);
    const s1 = formatRuDayShort(viewStart);
    const s2 = end.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
    return `${s1} – ${s2}`;
  }, [viewStart]);

  /* ---- 5) Render ---- */
  return (
    <div className="calendar-wrap">
      <h3>Бронирования (неделя)</h3>

      <div className="calendar-left">
        <div className="calendar-header">
          <button onClick={goPrev} disabled={!canGoPrev} className="nav-btn nav-prev">
            &lt; {hasUnreadLeft && <span className="nav-dot" />}
          </button>

          <div className="cal-month-title">{weekLabel}</div>

          <button onClick={goNext} className="nav-btn nav-next">
            {hasUnreadRight && <span className="nav-dot" />} &gt;
          </button>
        </div>

        <div className="calendar-grid">
          {weekCells.map((cell) => {
            const isSelected = cell.key === selectedDayKey;
            return (
              <button
                type="button"
                key={cell.key}
                className={`cal-cell ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDayKey(cell.key)}
              >
                <div className="cal-daynum">{formatRuDayShort(cell.date)}</div>
                {cell.cnt > 0 && <div className="cal-badge">{cell.cnt}</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="selected-day-title">
        {new Date(selectedDayKey).toLocaleDateString('ru-RU')}
      </div>

      <div className="slot-mini-grid">
        {timeline.map(slot => {
          const count = (timeMap[slot]?.length || 0);
          const isActive = activeSlot === slot;
          const unreadCnt = unreadBySlot[slot] || 0;

          return (
            <button
              key={slot}
              type="button"
              className={`slot-mini ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (count > 0) {
                  setActiveSlot(isActive ? null : slot);
                  markSlotRead(slot);
                }
              }}
              disabled={count === 0}
              title={count ? `${count} бронир.` : 'Нет брони'}
            >
              <span className="slot-mini-time">{slot}</span>
              {count > 0 && <span className="slot-mini-badge">{count}</span>}
              {unreadCnt > 0 && <span className="slot-unread-dot" title={`Новые: ${unreadCnt}`} />}
            </button>
          );
        })}
      </div>

      <div className="slot-details-panel">
        {activeSlot && (timeMap[activeSlot]?.length > 0) ? (
          <>
            <div className="details-title">Бронирования в {activeSlot}</div>
            <div className="details-list">
              {timeMap[activeSlot].map(b => (
                <div className="booking-chip" key={b.id}>
                  <div className="chip-line"><strong>{b.time}</strong> — {b.service}</div>
                  <div className="chip-line">
                    {b.name} {b.quantity ? `| мест: ${b.quantity}` : ''} {b.phone ? `| ${b.phone}` : ''}
                  </div>
                  <button className="chip-delete" onClick={() => onDelete?.(b.id)}>Удалить</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="details-title">Нет выбранного слота или бронирований в нём</div>
        )}
      </div>
    </div>
  );
}

export default CalendarBookings;
