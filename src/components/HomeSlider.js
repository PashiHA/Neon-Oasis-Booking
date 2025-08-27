// src/components/HomeSlider.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./HomeSlider.css";

export default function HomeSlider({ images = [], interval = 2000 }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  const count = images.length;
  if (!count) return null;

  const clear = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = useCallback(() => {
    clear();
    timerRef.current = setInterval(
      () => setIndex((i) => (i + 1) % count),
      Math.max(interval, 800)
    );
  }, [count, interval]);

  useEffect(() => {
    start();
    return clear;
  }, [start]);

  // Навигация
  const goTo = (i) => {
    setIndex(((i % count) + count) % count);
    start(); // перезапустить автопрокрутку
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Клавиатура
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  // Тач-свайп
  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const dx = endX - (touchStartX.current ?? endX);
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchStartX.current = null;
  };

  return (
    <div
      className="slider"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={clear}
      onMouseLeave={start}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Фото слайдер"
    >
      {/* Слайды */}
      {images.map((src, i) => (
        <div
          key={i}
          className={`slide ${i === index ? "is-active" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
          aria-hidden={i !== index}
        />
      ))}

      {/* Стрелки (опционально можешь скрыть) */}
      

      {/* Точки */}
      <div className="dots" role="tablist" aria-label="Навигация по слайдам">
        {images.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === index}
            aria-label={`Перейти к слайду ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
