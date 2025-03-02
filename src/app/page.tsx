"use client";
import React, { useEffect, useState } from "react";
import { List, Placeholder } from "@telegram-apps/telegram-ui";
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import Artilith_logo from "../app/_assets/Artilith_logo-no-bg.png";

export default function Home() {
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000); // Початковий інтервал 1 секунда
  const [isClickable, setIsClickable] = useState(true);
  const [animationTime, setAnimationTime] = useState(1100); // Початковий час анімації
  const [countdown, setCountdown] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isClickable) {
      setCountdown(clickDelay / 1000);
      const newTimer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      setTimer(newTimer);
    } else {
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isClickable, clickDelay]);

  useEffect(() => {
    const imgWrap = document.querySelector(".imgWrap");

    if (imgWrap) {
      const handleClick = () => {
        if (!isClickable) return;

        setIsClickable(false);
        setPoints((prev) => prev + 1);
        imgWrap.classList.add("active");

        setTimeout(() => {
          imgWrap.classList.remove("active");
        }, animationTime); // Динамічний час анімації

        setTimeout(() => {
          setClickDelay((prev) => prev + 1000); // Збільшення інтервалу
          setAnimationTime((prev) => prev + 1000); // Збільшення часу анімації
          setIsClickable(true);
        }, clickDelay); // Затримка перед наступним кліком
      };

      imgWrap.addEventListener("click", handleClick);

      return () => {
        imgWrap.removeEventListener("click", handleClick);
      };
    }
  }, [isClickable, clickDelay, animationTime]);

  return (
    <Page back={false}>
      <List>
        <TopBar />
        <div className="HIJtihMA8FHczS02iWF5">
          <Placeholder>
          <svg className="filter">
              <filter id="alphaRed">
                <feColorMatrix
                  mode="matrix"
                  values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  result="joint"
                />
              </filter>
              <filter id="alphaGreen">
                <feColorMatrix
                  mode="matrix"
                  values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  result="joint"
                />
              </filter>
              <filter id="alphaBlue">
                <feColorMatrix
                  mode="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                  result="joint"
                />
              </filter>
              <filter id="alpha">
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </svg>
            <div className="page">
              <h1>HOLD</h1>
              <h2>If you keep it you reap the rewards</h2>
              <p>Points: {points}</p>
              <p>Animation time: {animationTime} ms</p>
              <div className="imgWrap">
                <img className="red" src={Artilith_logo.src} alt="Artilith Logo Red" />
                <img className="green" src={Artilith_logo.src} alt="Artilith Logo Green" />
                <img className="blue" src={Artilith_logo.src} alt="Artilith Logo Blue" />
                <p className="text">
                  <span>Decrypt . . . {countdown}</span>
                </p>
              </div>
            </div>
          </Placeholder>
        </div>
        <BottomBar />
      </List>
    </Page>
  );
}