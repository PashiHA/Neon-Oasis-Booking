import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, push, onValue } from 'firebase/database';
import './booking.css';

function Booking() {
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
      const list = Object.entries(data).map(([id, entry]) => entry);
      setBookingsList(list);
    });
  }, []);

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

  const countForSlot = (service, date, time) => {
    return bookingsList
      .filter(b => b.service === service && b.date === date && b.time === time)
      .reduce((sum, b) => sum + (b.quantity || 1), 0);
  };

  const capacity = {
    VR: 4,
    PS5: 2,
    Billiard: 2
  };

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
      alert(`На выбранный таймслот осталось только ${max - used} мест(о) для ${formData.service}`);
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

  const timeslots = generateTimes();

  return (
    <div className="booking-form-container">
      <form onSubmit={sendBooking} className="booking-form">
        <h2>Забронировать</h2>

        <label>
          Имя:
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Телефон:
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Развлечение:
          <select
            name="service"
            value={formData.service}
            onChange={handleChange}
            required
          >
            <option value="">Выбери</option>
            <option value="VR">VR</option>
            <option value="PS5">PlayStation 5</option>
            <option value="Billiard">Бильярд</option>
          </select>
        </label>

        {formData.service && (
          <label>
            Количество игровых мест:
            <select
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            >
              {Array.from({ length: capacity[formData.service] }, (_, i) => i + 1).map(q => {
                const used = countForSlot(formData.service, formData.date, formData.time);
                const disabled = used + q > capacity[formData.service];
                return (
                  <option key={q} value={q} disabled={disabled}>
                    {q}{disabled ? ' (недоступно)' : ''}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <label>
          Дата брони:
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Время:
          <select
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          >
            <option value="">Выбери</option>
            {timeslots.map(ts => {
              const used = countForSlot(formData.service, formData.date, ts);
              const max = capacity[formData.service] || 1;
              const disabled = !formData.service || used >= max;
              return (
                <option key={ts} value={ts} disabled={disabled}>
                  {ts}{disabled ? ` (нет мест)` : ` (осталось ${max - used})`}
                </option>
              );
            })}
          </select>
        </label>

        <button type="submit" disabled={!formData.time}>
          Отправить
        </button>
        {success && <div className="success">Бронирование отправлено!</div>}
      </form>
      <p className="notice">
  Если Вы не приходите в течение 15 минут после бронирования, ваша бронь автоматически отменяется.
      </p>
    </div>
  );
}

export default Booking;
