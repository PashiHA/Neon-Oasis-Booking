import React from 'react';
import './Home.css';
import ps5 from '../img/ps5.png';
import vr from '../img/vr.png';
import billiard from '../img/billiard.png';

const mockStatus = {
  'VR-игры': 'Свободно',
  'PlayStation': 'Занято',
  'Бильярд': 'Свободно'
};

function Home() {
  return (
    <div className="home">

      <div className="logo-section">
        <div className="logo-circle ">🌴</div>
        <h1 className="brand-title">NEON OASIS</h1>
      </div>

      <section className="activities">
        <h2 className="section-title">НАШИ РАЗВЛЕЧЕНИЯ</h2>
        <div className="activity-grid">
          <div className="activity-item">
            <img src={vr} alt="VR" />
            <p>VR-игры</p>
          </div>
          <div className="activity-item ">
            <img src={ps5} alt="PS" />
            <p>PlayStation</p>
          </div>
          <div className="activity-item ">
            <img src={billiard} alt="Billiard" />
            <p>Бильярд</p>
          </div>
        </div>
      </section>

      <section className="status">
        <h2 className="section-title">ЗАНЯТОСТЬ В РЕАЛЬНОМ ВРЕМЕНИ</h2>
        <ul className="status-list">
          {Object.entries(mockStatus).map(([activity, status]) => (
            <li key={activity}>
              <span>{activity}</span>
              <span className={`status-dot ${status === 'Свободно' ? 'free' : 'busy'}`}></span>
              <span className="status-text">{status}</span>
            </li>
          ))}
        </ul>
      </section>

      <button className="booking-btn">ОНЛАЙН-БРОНИРОВАНИЕ</button>
    </div>
  );
}

export default Home;
