import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Home from './components/Home.js' 
import Admin from './components/Admin';
import Booking from './components/booking.js';
import logo from './img/logo.png'

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

function App() {
  
  return (
    <Router>
      <div style={{ fontFamily: 'Arial' }}>
        <header >
          <img src={logo}/>
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
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
