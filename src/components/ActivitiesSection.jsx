// src/components/ActivitiesSection.jsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import "./ActivitiesSection.css";

export default function ActivitiesSection({ vr, ps5, billiard, pcIcon, autosimIcon }) {
  const items = useMemo(
    () => [
      { title: "VR-игры", img: vr },
      { title: "PlayStation", img: ps5 },
      { title: "Бильярд", img: billiard },
      { title: "ПК", img: pcIcon },
      { title: "Автосимуляторы", img: autosimIcon },
    ],
    [vr, ps5, billiard, pcIcon, autosimIcon]
  );

  const [index, setIndex] = useState(0);
  const len = items.length;

  const next = useCallback(() => setIndex((p) => (p + 1) % len), [len]);
  const prev = useCallback(() => setIndex((p) => (p - 1 + len) % len), [len]);

  // ---------------- Swipe state ----------------
  const wrapRef = useRef(null);
  const swipeRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    locked: false, // true => горизонтальный свайп, можно preventDefault
  });

  const SWIPE_MIN_PX = 40;      // минимальная дистанция
  const LOCK_ANGLE = 18;        // градусов: если отклонение по Y небольшое -> считаем горизонтальным

  const onPointerDown = (e) => {
    // только основной палец/кнопка
    if (e.pointerType === "mouse" && e.button !== 0) return;

    swipeRef.current.active = true;
    swipeRef.current.locked = false;
    swipeRef.current.startX = e.clientX;
    swipeRef.current.startY = e.clientY;
    swipeRef.current.lastX = e.clientX;
    swipeRef.current.lastY = e.clientY;

    // захват указателя — чтобы не терять события
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!swipeRef.current.active) return;

    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    swipeRef.current.lastX = e.clientX;
    swipeRef.current.lastY = e.clientY;

    // определяем, горизонтальный ли жест
    if (!swipeRef.current.locked) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 8 && ady < 8) return;

      // угол: чем меньше ady относительно adx — тем более горизонтально
      const angle = (Math.atan2(ady, adx) * 180) / Math.PI; // 0 = строго горизонтально
      if (angle <= LOCK_ANGLE) {
        swipeRef.current.locked = true;
      } else {
        // вертикальный скролл — не мешаем
        swipeRef.current.active = false;
        return;
      }
    }

    // если горизонтально — блокируем прокрутку страницы во время жеста
    if (swipeRef.current.locked) {
      e.preventDefault?.();
    }
  };

  const finishSwipe = () => {
    const s = swipeRef.current;
    if (!s.active) return;

    s.active = false;

    const dx = s.lastX - s.startX;
    const dy = s.lastY - s.startY;

    // если жест был явно вертикальный — ничего
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) >= SWIPE_MIN_PX) {
      if (dx < 0) next();  // свайп влево => следующий
      else prev();         // свайп вправо => предыдущий
    }
  };

  // ---------------- Carousel math ----------------
  const getOffset = (i) => {
    const raw = i - index;
    const wrapped = ((raw % len) + len) % len;
    const half = Math.floor(len / 2);
    return wrapped > half ? wrapped - len : wrapped;
  };

  const cardStyle = (offset) => {
    const abs = Math.abs(offset);
    const maxVisible = 2;
    if (abs > maxVisible) {
      return {
        opacity: 0,
        pointerEvents: "none",
        transform: "translate3d(0,0,0) scale(0.9)",
      };
    }

    const stepX = 56; // %
    const z = offset === 0 ? 0 : -80 * abs;
    const scale = offset === 0 ? 1 : abs === 1 ? 0.88 : 0.78;
    const opacity = offset === 0 ? 1 : abs === 1 ? 0.72 : 0.45;
    const rotateY = offset === 0 ? 0 : offset > 0 ? -10 * abs : 10 * abs;

    return {
      opacity,
      transform: `translate3d(${offset * stepX}%, 0, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
      zIndex: offset === 0 ? 5 : abs === 1 ? 4 : 3,
      pointerEvents: offset === 0 ? "auto" : "none",
      filter: offset === 0 ? "none" : "brightness(0.92)",
    };
  };

  return (
    <section className="activities">
      <h2 className="section-title">НАШИ РАЗВЛЕЧЕНИЯ</h2>

      {/* ===== DESKTOP VERSION ===== */}
      <div className="activity-row desktop">
        {items.map((item, i) => (
          <div className="activity-item" key={i}>
            <img src={item.img} alt={item.title} />
            <p>{item.title}</p>
          </div>
        ))}
      </div>

      {/* ===== MOBILE/TABLET CIRCULAR CAROUSEL ===== */}
      <div className="carousel mobile" aria-label="Activities carousel">
        <button className="nav left" onClick={prev} aria-label="Previous">
          ‹
        </button>

        <div
          ref={wrapRef}
          className="carousel-wrapper"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishSwipe}
          onPointerCancel={finishSwipe}
          onPointerLeave={finishSwipe}
          role="group"
          aria-roledescription="carousel"
        >
          {items.map((item, i) => {
            const offset = getOffset(i);
            return (
              <div className="carousel-card" style={cardStyle(offset)} key={i}>
                <img src={item.img} alt={item.title} draggable="false" />
                <p>{item.title}</p>
              </div>
            );
          })}
        </div>

        <button className="nav right" onClick={next} aria-label="Next">
          ›
        </button>

        <div className="carousel-hint"></div>
      </div>
    </section>
  );
}
