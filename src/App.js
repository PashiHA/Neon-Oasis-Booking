import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Home from './components/Home.js' 

const mockStatus = {
  VR: 'Свободно',
  PlayStation: 'Занято',
  Бильярд: 'Свободно',
};



function About() {
  return (
    <div>
      <h2>О нас</h2>
      <p>Neon Oasis — это современный развлекательный центр в Бельцах, Молдова, где вы можете провести время с друзьями за VR-играми, PlayStation или за партией в бильярд. У нас уютная атмосфера и качественное оборудование!</p>
    </div>
  );
}

function Booking() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    activity: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert('Ошибка бронирования');
    }
  };

  return (
    <div>
      <h2>Забронировать</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Имя" value={form.name} onChange={handleChange} required /><br /><br />
        <input name="phone" placeholder="Телефон" value={form.phone} onChange={handleChange} required /><br /><br />
        <input name="date" type="date" value={form.date} onChange={handleChange} required /><br /><br />
        <input name="time" type="time" value={form.time} onChange={handleChange} required /><br /><br />
        <select name="activity" value={form.activity} onChange={handleChange} required>
          <option value="">Выберите активность</option>
          <option value="VR">VR</option>
          <option value="PlayStation">PlayStation</option>
          <option value="Бильярд">Бильярд</option>
        </select><br /><br />
        <button type="submit">Забронировать</button>
      </form>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'Arial' }}>
        <header >
          <h1>Neon Oasis</h1>
          <nav>
            <Link className='link' to="/" >Главная</Link>
            <Link  className='link' to="/about" >О нас</Link>
            <Link  className='link' to="/booking">Бронирование</Link>
          </nav>
        </header>

        <main style={{ padding: 20 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/booking" element={<Booking />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
