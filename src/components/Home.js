import React from 'react';
import './Home.css';
import ps5 from '../img/ps5.png';
import vr from '../img/vr.png';
import billiard from '../img/billiard.png';
import billiard_booking from '../img/billiard_booking.jpg'
import vr_booking from '../img/vr_booking.jpg'
import ps5_booking from '../img/ps5_booking.png'


const mockStatus = {
  'VR-игры': 'Свободно',
  'PlayStation': 'Занято',
  'Бильярд': 'Свободно'
};
const status = {
  billiard1: 'free',
  billiard2: 'busy',
  ps1: 'busy',
  ps2: 'free',
  vr1: 'free',
  vr2: 'free',
  vr3: 'busy',
  vr4: 'free',
  vr5: 'free',
  vr6: 'busy',
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

      <section className="layout-status">
        <h2 className="section-title">ЗАНЯТОСТЬ В ПОМЕЩЕНИИ</h2>
        <div className="room-layout">
          <div className="billiard-zone">
            <div className={`box  billiard1`}>
            <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.billiard1}`}></div>
              </div>
              </div>
            <div className={`box ${status.billiard2} billiard2`}>
            <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.billiard2}`}></div>
              </div>
            </div>
          </div>
          <div className="vr-zone">
            <div className={`box vr1 `}>
              <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.vr1}`}></div>
              </div>
              </div>
            <div className={`box vr2 }`}>
            <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.vr2}`}></div>
              </div>
              </div>
              <div className={`box vr3 `}>
              <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.vr3}`}></div>
              </div>
              </div>
              <div className={`box vr4 `}>
              <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.vr4}`}></div>
              </div>
              </div>
            </div>
            <div className="ps-zone">
            <div className={`box ps1`}>
            <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.ps1}`}></div>
              </div>
            </div>
            <div className={`box  ps2`}>
            <div className='status'>
                <h3>Статус:</h3>
                <div className={`status-radius ${status.ps2}`}></div>
              </div>
            </div>
          </div>
          </div>
      </section>

      <button className="booking-btn">ОНЛАЙН-БРОНИРОВАНИЕ</button>
    </div>
  );
}

export default Home;
