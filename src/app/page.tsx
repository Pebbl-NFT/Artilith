"use client";
import React, { useEffect } from 'react';
import { List, Placeholder } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { Page } from '@/components/Page';
import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';
import Artilith_logo from '../app/_assets/Artilith_logo-no-bg.png';

export default function Home() {
  useEffect(() => {
    const imgWrap = document.querySelector(".imgWrap");
    if (!imgWrap) return;
  
    const handlePointerDown = () => {
      imgWrap.classList.add("fast-glitch");
      setTimeout(() => {
        imgWrap.classList.remove("fast-glitch");
      }, 300);
    };
  
    const applyRandomEffect = () => {
      const randEffect = Math.random() > 0.5 ? "glitch" : "fast-glitch";
      imgWrap.classList.add(randEffect);
      setTimeout(() => {
        imgWrap.classList.remove(randEffect);
      }, 200);
    };
  
    imgWrap.addEventListener("pointerdown", handlePointerDown);
    const interval = setInterval(applyRandomEffect, 500);
  
    return () => {
      imgWrap.removeEventListener("pointerdown", handlePointerDown);
      clearInterval(interval);
    };
  }, []);
  return (
    <Page back={false}>
      <List>
        <TopBar />
        <div className="HIJtihMA8FHczS02iWF5">
          <Placeholder 
            >
            <svg className="filter">
              <filter id="alphaRed">
                <feColorMatrix mode="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="joint" />
              </filter>
              <filter id="alphaGreen">
                <feColorMatrix mode="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="joint" />
              </filter>
              <filter id="alphaBlue">
                <feColorMatrix mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="joint" />
              </filter>
              <filter id="alpha">
                <feColorMatrix type="saturate" values="0"/>
              </filter>
            </svg>
            <div className="page">
              <h1>HOLD to decrypt !</h1>
              <h2>If you keep it you reap the rewards</h2>
              <div className="imgWrap">
                <img className="red" src={Artilith_logo.src} alt="Artilith Logo Red"/>
                <img className="green" src={Artilith_logo.src} alt="Artilith Logo Green"/>
                <img className="blue" src={Artilith_logo.src} alt="Artilith Logo Blue"/>
                <p className="text"><span>Decode . . .</span></p>
              </div>
            </div>
          </Placeholder>
        </div>
        <BottomBar />
      </List>
    </Page>
  );
}
