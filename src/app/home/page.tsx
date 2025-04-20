"use client";

import React, { useEffect, useState, useRef } from "react";
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

  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
        setAnimationTime(data.click_delay + 100);
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

  const updateCountdown = (endTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    const remaining = Math.ceil((endTime - now) / 1000);

    if (remaining <= 0) {
      setCountdown(0);
      setIsClickable(true);
      localStorage.removeItem("nextClickTime");
      return;
    }

    setCountdown(remaining);
    setIsClickable(false);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setCountdown(0);
        setIsClickable(true);
        localStorage.removeItem("nextClickTime");
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  useEffect(() => {
    const savedNextClick = localStorage.getItem("nextClickTime");
    if (savedNextClick) {
      const endTime = parseInt(savedNextClick, 10);
      updateCountdown(endTime);
    }
  }, []);

  const handleClick = async () => {
    if (!isClickable) return;

    const nextAvailableClick = Date.now() + clickDelay;
    localStorage.setItem("nextClickTime", nextAvailableClick.toString());

    setIsClickable(false);
    updateCountdown(nextAvailableClick);

    const newPoints = points + 1;
    const newClickDelay = clickDelay + 1000;

    setPoints(newPoints);
    setClickDelay(newClickDelay);
    setAnimationTime(newClickDelay + 100);
    saveUserData(newPoints, newClickDelay);

    // Додаємо клас для пульсації
    const imgWrap = document.querySelector(".imgWrap");
    if (imgWrap) {
      imgWrap.classList.add("active");
      setTimeout(() => {
        imgWrap.classList.remove("active");
      }, 1000); // Відповідно до часу анімації
    }
  };

  return (
    <Page back={false}>
      <List>
        <TopBar points={points} />
        <div
          className="HIJtihMA8FHczS02iWF5"
          style={{ overflow: "visible" }}
          onClick={handleClick}
        >
          <Placeholder>
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "-20px",
              }}
            >
              <h1
                style={{
                  fontSize: "3rem",
                  fontWeight: "bold",
                  marginBottom: "16px",
                  marginTop: "-4px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                HOLD
              </h1>

              <div
                className="imgWrap"
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginTop: "-30px",
                  width: "90%",
                  height: "90%",
                }}
              >
                <Image
                className="blue"
                alt="Artilith Logo Blue"
                src={artilithLogo}
                width={400}
                height={400}
                style={{
                  position: "absolute",
                  width: "90%",
                  height: "auto",
                  maxWidth: "300px", // для мобілки
                }}
                />
                <p
                  className="text"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    color: "#fff",
                    position: "absolute",
                    bottom: "50%",
                    left: "52%",
                    top: "190px",
                    margin: "-5px",
                    marginTop: "-10px",
                    textAlign: "center",
                  }}
                >
                  <span>
                    {countdown > 0 ? `Decrypt . . . ${countdown}` : "Tap to decrypt"}
                  </span>
                </p>
              </div>
              {countdown > 0 ? `Decrypt . . . ${countdown}` : "Tap to decrypt"}
            </div>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: "lighter",
                color: "#ccc",
                textAlign: "center",
                marginBottom: "20px",
                marginTop: "30px",
                lineHeight: "1.4",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Collect shards to unlock new possibilities and progress faster
            </h2>
          </Placeholder>
        </div>
        <BottomBar />
      </List>
    </Page>
  );
}
