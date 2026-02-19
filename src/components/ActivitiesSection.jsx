// src/components/ActivitiesSection.jsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./ActivitiesSection.css";

export default function ActivitiesSection({ vr, ps5, billiard, pcIcon, autosimIcon }) {
  const navigate = useNavigate();

  const items = useMemo(
    () => [
      { key: "vr", title: "VR-игры", img: vr },
      { key: "ps", title: "PlayStation", img: ps5 },
      { key: "billiard", title: "Бильярд", img: billiard },
      { key: "pc", title: "ПК", img: pcIcon },
      { key: "autosim", title: "Автосимуляторы", img: autosimIcon },
    ],
    [vr, ps5, billiard, pcIcon, autosimIcon]
  );

  const goBooking = useCallback(
    (activityKey) => {
      navigate(`/Booking?activity=${encodeURIComponent(activityKey)}`);
    },
    [navigate]
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
    locked: false, // true => горизонтальный свайп
  });

  const SWIPE_MIN_PX = 40;
  const LOCK_ANGLE = 18;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    swipeRef.current.active = true;
    swipeRef.current.locked = false;
    swipeRef.current.startX = e.clientX;
    swipeRef.current.startY = e.clientY;
    swipeRef.current.lastX = e.clientX;
    swipeRef.current.lastY = e.clientY;

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

    if (!swipeRef.current.locked) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 8 && ady < 8) return;

      const angle = (Math.atan2(ady, adx) * 180) / Math.PI;
      if (angle <= LOCK_ANGLE) {
        swipeRef.current.locked = true;
      } else {
        swipeRef.current.active = false;
        return;
      }
    }

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

    if (Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) >= SWIPE_MIN_PX) {
      if (dx < 0) next();
      else prev();
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
      // ✅ даём клик ТОЛЬКО на центральную карточку (как у тебя было)
      pointerEvents: offset === 0 ? "auto" : "none",
      filter: offset === 0 ? "none" : "brightness(0.92)",
      cursor: offset === 0 ? "pointer" : "default",
    };
  };

  return (
    <section className="activities">
      <h2 className="section-title">НАШИ РАЗВЛЕЧЕНИЯ</h2>

      {/* ===== DESKTOP VERSION ===== */}
      <div className="activity-row desktop">
        {items.map((item) => (
          <div
            className="activity-item"
            key={item.key}
            onClick={() => goBooking(item.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && goBooking(item.key)}
            style={{ cursor: "pointer" }}
          >
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
            const isCenter = offset === 0;

            return (
              <div
                className="carousel-card"
                style={cardStyle(offset)}
                key={item.key}
                onClick={isCenter ? () => goBooking(item.key) : undefined}
                role={isCenter ? "button" : undefined}
                tabIndex={isCenter ? 0 : -1}
                onKeyDown={
                  isCenter ? (e) => e.key === "Enter" && goBooking(item.key) : undefined
                }
              >
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
