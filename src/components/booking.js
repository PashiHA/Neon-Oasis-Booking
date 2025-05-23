
import React, { useState } from 'react';
import emailjs from 'emailjs-com';
import './booking.css';

function Booking() {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: today,
    time: '',
  });

  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs.send(
      'service_dgtdcrk',
      'template_euajgwg',
      formData,
      'Gns4g6KclreYiKik0'
    )
    .then(() => {
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', service: '', date: today, time: '' });
    })
    .catch((error) => {
      console.error('Ошибка отправки:', error);
    });
  };

  return (
    <div className="booking-form-container">
      <form onSubmit={sendEmail} className="booking-form">
        <h2>Забронировать</h2>
        <label>
          Имя:
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>
        <label>
          Email:
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
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
          <input type="time" name="time" value={formData.time} onChange={handleChange} required />
        </label>
        <button type="submit">Отправить</button>
        {success && <div className="success">Бронирование отправлено!</div>}
      </form>
    </div>
  );
}

export default Booking;
