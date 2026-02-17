import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import "./booking.css";

export default function Booking() {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const capacity = useMemo(
    () => ({
      VR: 4,
      PS5: 2,
      Billiard: 2,
      Autosim: 2,
      PC: 5, // ✅ ПК
    }),
    []
  );

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",        // ✅ email добавили
    service: "",
    date: todayStr,
    time: "",
    quantity: 1,
  });

  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [bookingsList, setBookingsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // читаем брони для календаря (занятость)
  useEffect(() => {
    const bookingsRef = ref(db, "bookings");
    return onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, b]) => ({ id, ...b }));
      setBookingsList(list);
    });
  }, []);

  const timeslots = useMemo(() => {
    const slots = [];
    let hour = 12;
    let minute = 0;
    while (hour < 24) {
      slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      minute += 30;
      if (minute === 60) { minute = 0; hour += 1; }
    }
    return slots;
  }, []);

  const countForSlot = (service, date, time) =>
    bookingsList
      .filter((b) => b.service === service && b.date === date && b.time === time)
      .reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);

  const getCurrentSlot = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = now.getMinutes() < 30 ? "00" : "30";
    return `${hh}:${mm}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSuccess(false);
    setSuccessMsg("");

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: name === "quantity" ? Number(value) : value,
      };

      if (name === "service") {
        next.time = "";
        next.quantity = 1;
      }
      if (name === "date") {
        next.time = "";
      }
      return next;
    });
  };

  const sendBooking = async (e) => {
    e.preventDefault();

    if (!formData.service || !formData.date || !formData.time) {
      alert("Выберите развлечение, дату и время.");
      return;
    }

    // Клиентская проверка для удобства (финальная будет на сервере)
    const max = capacity[formData.service] || 1;
    const used = countForSlot(formData.service, formData.date, formData.time);
    if (used + formData.quantity > max) {
      alert(`На выбранный таймслот осталось только ${Math.max(0, max - used)} мест`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity) || 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Ошибка отправки бронирования");
        return;
      }

      setSuccess(true);
      setSuccessMsg(
        data?.emailSent
          ? "Бронирование отправлено! Ссылка для изменения отправлена на e-mail."
          : "Бронирование отправлено! (E-mail не указан — ссылка показана на экране.)"
      );

      // можно показать ссылку прямо на странице (если хочешь)
      if (data?.editUrl) {
        console.log("Edit URL:", data.editUrl);
      }

      setFormData({
        name: "",
        phone: "",
        email: "",
        service: "",
        date: todayStr,
        time: "",
        quantity: 1,
      });
    } catch (err) {
      console.error(err);
      alert("Ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    if (!formData.service) return null;

    const todayLocal = new Date().toISOString().split("T")[0];
    const currentSlot = getCurrentSlot();

    return (
      <div className="calendar-grid">
        {timeslots
          .filter((ts) => formData.date !== todayLocal || ts >= currentSlot)
          .map((ts) => {
            const max = capacity[formData.service] || 1;
            const used = countForSlot(formData.service, formData.date, ts);
            const free = max - used;
            const isFull = free <= 0;

            return (
              <button
                type="button"
                key={ts}
                className={`calendar-cell ${isFull ? "full" : "free"} ${formData.time === ts ? "selected" : ""}`}
                disabled={isFull}
                onClick={() => setFormData((f) => ({ ...f, time: ts }))}
              >
                <div className="time-label">{ts}</div>
                <div className="free-count">{isFull ? "—" : `${free} свободно`}</div>
              </button>
            );
          })}
      </div>
    );
  };

  return (
    <div className="booking-form-container">
      <form onSubmit={sendBooking} className="booking-form">
        <h2>Забронировать</h2>

        <label>
          Имя:
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>

        <label>
          Телефон:
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
        </label>

        <label>
          E-mail (для ссылки на изменение):
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
          />
        </label>

        <label>
          Развлечение:
          <select name="service" value={formData.service} onChange={handleChange} required>
            <option value="">Выбери</option>
            <option value="VR">VR</option>
            <option value="PS5">PlayStation 5</option>
            <option value="Billiard">Бильярд</option>
            <option value="Autosim">Автосимулятор</option>
            <option value="PC">Компьютеры (5 ПК)</option>
          </select>
        </label>

        <label>
          Кол-во мест:
          <select
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            disabled={!formData.service}
          >
            {Array.from({ length: capacity[formData.service] || 1 }, (_, i) => i + 1).map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </label>

        <label>
          Дата брони:
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </label>

        {renderCalendar()}

        <button type="submit" disabled={!formData.time || loading}>
          {loading ? "Отправка..." : "Отправить"}
        </button>

        {success && <div className="success">{successMsg || "Бронирование отправлено!"}</div>}
      </form>

      <p className="notice">
        Если не приходите в течение 15 минут, бронь автоматически отменяется.
      </p>
    </div>
  );
}
