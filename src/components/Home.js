import React, { useEffect, useState } from 'react';
import './Home.css';
import ps5 from '../img/ps5.png';
import vr from '../img/vr.png';
import billiard from '../img/billiard.png';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

function Home() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    const statusesRef = ref(db, 'statuses');
    const unsubscribe = onValue(statusesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStatus(data);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderBox = (key) => {
    const item = status[key];
    const itemStatus = item?.status || 'Свободно';
    const until = item?.until || null;
    const timeLeft = until ? Math.max(0, until - Date.now()) : 0;
    const minutes = Math.floor(timeLeft / 60000);

    return (
      <div className={`box ${key}`} key={key}>
        <div className='status'>
          <h3>Статус:</h3>
          <div className={`status-radius ${itemStatus === 'Занято' ? 'busy' : 'free'}`}></div>
          {itemStatus === 'Занято' && until && (
            <div className="time-left"> {minutes} мин</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="home">
      <div className="logo-section">
        <div className="logo-circle">🌴</div>
        <h1 className="brand-title">NEON OASIS</h1>
      </div>

      <section className="activities">
        <h2 className="section-title">НАШИ РАЗВЛЕЧЕНИЯ</h2>
        <div className="activity-grid">
          <div className="activity-item">
            <img src={vr} alt="VR" />
            <p>VR-игры</p>
          </div>
          <div className="activity-item">
            <img src={ps5} alt="PS" />
            <p>PlayStation</p>
          </div>
          <div className="activity-item">
            <img src={billiard} alt="Billiard" />
            <p>Бильярд</p>
          </div>
        </div>
      </section>

      <section className="layout-status">
        <h2 className="section-title">ЗАНЯТОСТЬ В ПОМЕЩЕНИИ</h2>
        <div className="room-layout">
          <div className="billiard-zone">
            {renderBox('billiard1')}
            {renderBox('billiard2')}
          </div>
          <div className="vr-zone">
            {['vr1', 'vr2', 'vr3', 'vr4'].map(renderBox)}
          </div>
          <div className="ps-zone">
            {['ps1', 'ps2'].map(renderBox)}
          </div>
        </div>
      </section>

      <button className="booking-btn">ОНЛАЙН-БРОНИРОВАНИЕ</button>
    </div>
  );
}

export default Home;
