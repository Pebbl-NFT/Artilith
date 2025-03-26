"use client";

import React, { useEffect, useState } from "react";
import { List, Placeholder } from "@telegram-apps/telegram-ui";
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import artilithLogo from "../_assets/Artilith_logo-no-bg.png";
import Image from "next/image";

export default function HomePage() {
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000);
  const [isClickable, setIsClickable] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [animationTime, setAnimationTime] = useState(1100);

  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("users")
        .select("points, click_delay")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Помилка завантаження даних:", error);
      } else if (data) {
        setPoints(data.points);
        setClickDelay(data.click_delay);
        setAnimationTime(data.click_delay + 100); // Анімація трохи довша за затримку
      }
    };
    fetchUserData();
  }, [userId]);

  const saveUserData = async (newPoints: number, newClickDelay: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from("users")
      .upsert([{ id: userId, points: newPoints, click_delay: newClickDelay }], {
        onConflict: "id",
      });

    if (error) console.error("Помилка збереження:", error);
  };

  const handleClick = async () => {
    if (!isClickable) return;

    setIsClickable(false);
    setCountdown(Math.ceil(clickDelay / 1000));

    let remainingTime = Math.ceil(clickDelay / 1000);
    const timer = setInterval(() => {
      remainingTime -= 1;
      setCountdown(remainingTime);
      if (remainingTime <= 0) {
        clearInterval(timer);

        const newPoints = points + 1;
        const newClickDelay = clickDelay + 1000;

        setPoints(newPoints);
        setClickDelay(newClickDelay);
        setAnimationTime(newClickDelay + 100);
        saveUserData(newPoints, newClickDelay);

        setIsClickable(true);
      }
    }, 1000);

    const imgWrap = document.querySelector(".imgWrap");
    if (imgWrap) {
      imgWrap.classList.add("active");
      setTimeout(() => {
        imgWrap.classList.remove("active");
      }, animationTime);
    }
  };

  return (
    <Page back={false}>
      <List>
        <TopBar />
        <div className="HIJtihMA8FHczS02iWF5" style={{ overflow: "visible" }} onClick={handleClick}>
          <Placeholder>
            <div className="page">
              <h1>HOLD</h1>
              <h2>If you keep it you reap the rewards</h2>
              <p>Points: {points}</p>
              <div className="imgWrap" style={{ overflow: "visible" }}>
                <Image className="red" alt="Artilith Logo Red" src={artilithLogo} width={500} height={500} />
                <Image className="green" alt="Artilith Logo Green" src={artilithLogo} width={500} height={500} />
                <Image className="blue" alt="Artilith Logo Blue" src={artilithLogo} width={500} height={500} />
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
