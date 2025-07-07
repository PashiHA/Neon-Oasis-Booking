import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, push, onValue } from 'firebase/database';
import './booking.css';

export default function Booking() {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '',
    date: today,
    time: '',
    quantity: 1
  });
  const [success, setSuccess] = useState(false);
  const [bookingsList, setBookingsList] = useState([]);

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    return onValue(bookingsRef, snapshot => {
      const data = snapshot.val() || {};
      const list = Object.values(data);
      setBookingsList(list);
    });
  }, []);

  const capacity = { VR: 4, PS5: 2, Billiard: 2 };

  const generateTimes = () => {
    const slots = [];
    let hour = 12;
    let minute = 0;
    while (hour < 24) {
      const h = String(hour).padStart(2, '0');
      const m = String(minute).padStart(2, '0');
      slots.push(`${h}:${m}`);
      minute += 30;
      if (minute === 60) { minute = 0; hour += 1; }
    }
    return slots;
  };
  const timeslots = generateTimes();

  const countForSlot = (service, date, time) =>
    bookingsList
      .filter(b => b.service === service && b.date === date && b.time === time)
      .reduce((sum, b) => sum + (b.quantity || 1), 0);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value
    }));
  };

  const sendBooking = async e => {
    e.preventDefault();
    const used = countForSlot(formData.service, formData.date, formData.time);
    const max = capacity[formData.service] || 1;
    if (used + formData.quantity > max) {
      alert(`На выбранный таймслот осталось только ${max - used} мест`);
      return;
    }
    try {
      await push(ref(db, 'bookings'), { ...formData, timestamp: Date.now() });
      setSuccess(true);
      setFormData({ name: '', phone: '', service: '', date: today, time: '', quantity: 1 });
    } catch (error) {
      console.error('Ошибка сохранения бронирования:', error);
    }
  };

  const renderCalendar = () => {
    if (!formData.service) return null;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentSlot = `${String(now.getHours()).padStart(2,'0')}:${now.getMinutes() < 30 ? '00' : '30'}`;

    return (
      <div className="calendar-grid">
        {timeslots
          .filter(ts => formData.date !== todayStr || ts >= currentSlot)
          .map(ts => {
            const used = countForSlot(formData.service, formData.date, ts);
            const max = capacity[formData.service];
            const free = max - used;
            const isFull = free <= 0;
            return (
              <button
                key={ts}
                className={`calendar-cell ${isFull ? 'full' : 'free'}`}
                disabled={isFull}
                onClick={() => setFormData(f => ({ ...f, time: ts }))}
              >
                <div className="time-label">{ts}</div>
                <div className="free-count">{isFull ? '—' : `${free} свободно`}</div>
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
        <label>Имя:<input type="text" name="name" value={formData.name} onChange={handleChange} required /></label>
        <label>Телефон:<input type="tel" name="phone" value={formData.phone} onChange={handleChange} required /></label>
        <label>Развлечение:
          <select name="service" value={formData.service} onChange={handleChange} required>
            <option value="">Выбери</option>
            <option value="VR">VR</option>
            <option value="PS5">PlayStation 5</option>
            <option value="Billiard">Бильярд</option>
          </select>
        </label>
        <label>Дата брони:<input type="date" name="date" value={formData.date} onChange={handleChange} required /></label>

        {renderCalendar()}

        <label>Кол-во мест:
          <select name="quantity" value={formData.quantity} onChange={handleChange} required>
            {Array.from({ length: capacity[formData.service] || 1 }, (_, i) => i + 1).map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={!formData.time}>Отправить</button>
        {success && <div className="success">Бронирование отправлено!</div>}
      </form>
      <p className="notice">Если не приходите в течение 15 минут, бронь автоматически отменяется.</p>
    </div>
  );
}
