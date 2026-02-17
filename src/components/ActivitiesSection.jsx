// src/components/ActivitiesSection.jsx
import React, { useMemo, useState } from "react";
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

  const next = () => setIndex((p) => (p + 1) % len);
  const prev = () => setIndex((p) => (p - 1 + len) % len);

  // offset в диапазоне [-half..half], где отрицательное = слева, положительное = справа
  const getOffset = (i) => {
    const raw = i - index;
    // нормализация по кругу
    const wrapped = ((raw % len) + len) % len; // 0..len-1
    // переводим в signed
    const half = Math.floor(len / 2);
    return wrapped > half ? wrapped - len : wrapped; // например: -2,-1,0,1,2
  };

  // Лёгкая функция transform, чтобы всё было плавно (GPU)
  const cardStyle = (offset) => {
    const abs = Math.abs(offset);

    // Сколько карточек видно по бокам (1 = только левая/правая, 2 = ещё дальние)
    const maxVisible = 2;
    if (abs > maxVisible) return { opacity: 0, pointerEvents: "none", transform: "translate3d(0,0,0) scale(0.9)" };

    // настройки "круга"
    const stepX = 56;        // % смещение по X
    const z = offset === 0 ? 0 : -80 * abs;  // чуть "в глубину"
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

        <div className="carousel-wrapper">
          {items.map((item, i) => {
            const offset = getOffset(i);
            return (
              <div className="carousel-card" style={cardStyle(offset)} key={i}>
                <img src={item.img} alt={item.title} />
                <p>{item.title}</p>
              </div>
            );
          })}
        </div>

        <button className="nav right" onClick={next} aria-label="Next">
          ›
        </button>
      </div>
    </section>
  );
}
