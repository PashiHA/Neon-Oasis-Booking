// src/App.js
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate
} from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import Admin from './components/Admin';
import Booking from './components/booking';
import VRGamesCatalog from './components/VRGamesCatalog';
import logo from './img/logo.png';
import { FaInstagram, FaTiktok, FaMapMarkerAlt } from 'react-icons/fa';

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

function ProtectedAdmin() {
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prompt only once per session
    if (!authorized) {
      const pwd = window.prompt('Введите пароль для доступа в админ-панель:');
      if (pwd === ADMIN_PASSWORD) {
        setAuthorized(true);
      } else {
        alert('Неверный пароль');
        navigate('/', { replace: true });
      }
    }
  }, [authorized, navigate, location]);

  return authorized ? <Admin /> : null;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      <div style={{ fontFamily: 'Exo 2' }}>
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
            <Link className="link" to="/VRGamesCatalog">VR игры</Link>
          </nav>

          {/* Десктопное меню — скрыто на мобилках */}
          <nav className="desktop-nav">
            <Link className="link" to="/">Главная</Link>
            <Link className="link" to="/booking">Бронирование</Link>
            <Link className="link" to="/VRGamesCatalog">VR игры</Link>
          </nav>
        </header>

        <main style={{ padding: 20 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/admin" element={<ProtectedAdmin />} />
            <Route path='/VRGamesCatalog' element={<VRGamesCatalog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer>
          <img src={logo}/>
          <div className="footer-media">
            <a href="https://www.instagram.com/_neon_oasis_?igsh=MWJyczZ0Ynd0YXUzcQ==" target="_blank" rel="noopener noreferrer" className="media-link">
              <FaInstagram className="icon neon" />
              <span className="media-label">Наш Instagram</span>
            </a>
            <a href="https://www.tiktok.com/@_neon_oasis_?_t=ZM-8xYVqXTaDzk&_r=1" target="_blank" rel="noopener noreferrer" className="media-link">
              <FaTiktok className="icon neon" />
              <span className="media-label">Наш TikTok</span>
            </a>
            <a href="https://maps.app.goo.gl/Y3tEmM1bNQzSNhpR6" target="_blank" rel="noopener noreferrer" className="media-link">
              <FaMapMarkerAlt className="icon neon" />
              <span className="media-label">Геолокация</span>
            </a>
          </div>
        </footer>
      </div>
    </Router>

  );
}

export default App;
