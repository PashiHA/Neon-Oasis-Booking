import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Home from './components/Home.js';
import Admin from './components/Admin';
import Booking from './components/booking.js';
import logo from './img/logo.png';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      <div style={{ fontFamily: 'Arial' }}>
        <header>
          <img src={logo} alt="Logo" />
          
          {/* Гамбургер-кнопка */}
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>

          {/* Мобильное меню */}
          <nav className={`mobile-nav ${menuOpen ? 'active' : ''}`}>
            <Link className="link" to="/" onClick={() => setMenuOpen(false)}>Главная</Link>
            <Link className="link" to="/booking" onClick={() => setMenuOpen(false)}>Бронирование</Link>
          </nav>

          {/* Десктопное меню — скрыто на мобилках */}
          <nav className="desktop-nav">
            <Link className="link" to="/">Главная</Link>
            <Link className="link" to="/booking">Бронирование</Link>
          </nav>
        </header>

        <main style={{ padding: 20 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
