const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config(); // Подключаем .env

const app = express();
const PORT = 5000;

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

app.use(cors());
app.use(express.json());

let bookings = [];

// Защищённый маршрут
app.get('/api/bookings', (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  res.json(bookings);
});

// Публичный маршрут для создания брони
app.post('/api/book', (req, res) => {
  const { name, phone, date, time, activity } = req.body;
  bookings.push({ name, phone, date, time, activity });
  res.status(200).json({ message: 'Бронирование успешно принято!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
