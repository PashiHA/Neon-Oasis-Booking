import React, { useState, useEffect } from 'react';
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
    time: ''
  });
  const [success, setSuccess] = useState(false);
  const [bookingsList, setBookingsList] = useState([]);

  // subscribe to bookings
  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    return onValue(bookingsRef, snapshot => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, entry]) => entry);
      setBookingsList(list);
    });
  }, []);

  // generate timeslots from 12:00 to 24:00 by 30min
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

  // count existing bookings per slot
  const countForSlot = (service, date, time) => {
    return bookingsList.filter(b =>
      b.service === service && b.date === date && b.time === time
    ).length;
  };

  const capacity = {
    VR: 4,
    PS5: 2,
    Billiard: 2
  };

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendBooking = async e => {
    e.preventDefault();
    try {
      await push(ref(db, 'bookings'), {
        ...formData,
        timestamp: Date.now()
      });
      setSuccess(true);
      setFormData({ name: '', phone: '', service: '', date: today, time: '' });
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
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>

        <label>
          Телефон:
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
        </label>

        <label>
          Развлечение:
          <select name="service" value={formData.service} onChange={handleChange} required>
            <option value="">Выбери</option>
            <option value="VR">VR</option>
            <option value="PS5">PlayStation 5</option>
            <option value="Billiard">Бильярд</option>
          </select>
        </label>

        <label>
          Дата брони:
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </label>

        <label>
          Время:
          <select name="time" value={formData.time} onChange={handleChange} required>
            <option value="">Выбери</option>
            {timeslots.map(ts => {
              const count = countForSlot(formData.service, formData.date, ts);
              const max = capacity[formData.service] || 1;
              const disabled = !formData.service || count >= max;
              return (
                <option key={ts} value={ts} disabled={disabled}>
                  {ts} {disabled ? ' (недоступно)' : ''}
                </option>
              );
            })}
          </select>
        </label>

        <button type="submit" disabled={!formData.time}>Отправить</button>
        {success && <div className="success">Бронирование отправлено!</div>}
      </form>
    </div>
  );
}

export default Booking;
