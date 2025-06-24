// server/index.js
require('dotenv').config();           // читает .env в корне
const express       = require('express');
const cors          = require('cors');
const path          = require('path');
const basicAuth     = require('express-basic-auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// Берём из .env
const ADMIN_USER = process.env.ADMIN_USER;   // например "admin"
const ADMIN_PASS = process.env.ADMIN_PASS;   // ваш секретный пароль

app.use(cors());
app.use(express.json());

// 1) Статика собранного React (после npm run build)
app.use(express.static(path.join(__dirname, '../build')));

// 2) Защита Basic Auth для всех /admin и вложенных путей
app.use('/admin', basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: true,           // браузер сам покажет окно логина
  realm: 'Admin Panel'       // текст в окошке
}));

// 3) Фоллбэк для React Router: если URL НЕ /api/* — отдать index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// 4) API-маршруты
let bookings = [];

// Защищённый роут для получения всех брони:
// требует заголовок Authorization: Bearer <API_TOKEN>
app.get('/api/bookings', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token      = authHeader.split(' ')[1];
  if (token !== process.env.API_TOKEN) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  res.json(bookings);
});

// Публичный роут для создания брони
app.post('/api/book', (req, res) => {
  const { name, phone, date, time, activity } = req.body;
  bookings.push({ name, phone, date, time, activity });
  res.status(200).json({ message: 'Бронирование успешно принято!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
