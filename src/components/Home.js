import React, { useEffect, useState } from 'react';
import './Home.css';
import ps5 from '../img/ps5.png';
import vr from '../img/vr.png';
import billiard from '../img/billiard.png';
import palma from '../img/palma.png';
import autosimIcon from '../img/autosim_actyvity.png'; // ✅ есть у тебя
import pcIcon from '../img/pc.png'; // ✅ добавь этот файл (или замени на свой)
import ActivitiesSection from "./ActivitiesSection";
import HomeSlider from './HomeSlider.js';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

import s1 from "../img/s1.jpg";
import s2 from "../img/s2.jpg";
import s3 from "../img/s3.jpg";
import s4 from "../img/s4.jpg";
import s5 from "../img/s5.jpg";
import s6 from "../img/s6.jpg";

function Home() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    const statusesRef = ref(db, 'statuses');
    const unsubscribe = onValue(statusesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setStatus(data);
    });

    return () => unsubscribe();
  }, []);

  const renderBox = (key) => {
    const item = status[key];
    const itemStatus = item?.status || 'Свободно';
    const until = item?.until || null;
    const timeLeft = until ? Math.max(0, until - Date.now()) : 0;

    const totalMinutes = Math.floor(timeLeft / 60000);
    let timeDisplay;
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      timeDisplay = `${hours} ч ${minutes} мин`;
    } else {
      timeDisplay = `${totalMinutes} мин`;
    }

    return (
      <div className={`box ${key}`} key={key}>
        <div className='status'>
          <h3>Статус:</h3>
          <div className={`status-radius ${itemStatus === 'Занято' ? 'busy' : 'free'}`}></div>
          {itemStatus === 'Занято' && until && (
            <div className="time-left">{timeDisplay}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="home">
      <div className='logo-section-container'>
        <div className="logo-section">
          <div className="logo-circle"><img src={palma} alt="logo" /></div>
          <h5 className="brand-title">
            Добро пожаловать в <span>Neon Oasis</span> - твой оазис развлечений, драйва и незабываемых впечатлений.
          </h5>
        </div>
        <HomeSlider images={[s1, s2, s3, s4, s5, s6]} interval={2000} />
      </div>

      <ActivitiesSection
        vr={vr}
        ps5={ps5}
        billiard={billiard}
        pcIcon={pcIcon}
        autosimIcon={autosimIcon}
      />

      <section className="layout-status">
        <h2 className="section-title">ЗАНЯТОСТЬ В ЗАВЕДЕНИИ</h2>

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

          <div className="autosim-zone">
            {['autosim1'].map(renderBox)}
            {['autosim2'].map(renderBox)}
          </div>
        </div>

        {/* ✅ НИЖЕ ВСЕХ — 5 ПК */}
        <div className="pc-row">
          {['pc1', 'pc2', 'pc3', 'pc4', 'pc5'].map((key, idx) => (
            <div className="pc-card-wrap" key={key}>
              <div className="pc-card-title">ПК {idx + 1}</div>
              {renderBox(key)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
