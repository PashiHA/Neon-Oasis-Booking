// server/index.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let bookings = []; // временно, без базы данных

app.post('/api/book', (req, res) => {
  const { name, phone, date, time, activity } = req.body;
  bookings.push({ name, phone, date, time, activity });
  res.status(200).json({ message: 'Бронирование успешно принято!' });
});

app.get('/api/bookings', (req, res) => {
  res.json(bookings);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
