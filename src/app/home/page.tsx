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
  const [activeTab, setActiveTab] = useState("home");


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

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    const pad = (num: number) => num.toString().padStart(2, "0");
  
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };
  const renderContent = () => {
    switch (activeTab) {
      case 'auction':
        return (
<div>
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
          marginBottom: "20px",
          marginTop: "5px",
          textAlign: "center",
          lineHeight: "1",
          color: "#fff",
        }}
      >
        AUCTION
      </h1>

      {/* Опис аукціону */}
      <p
        style={{
          fontSize: "1.2rem",
          color: "#ddd",
          textAlign: "center",
          marginBottom: "30px",
          maxWidth: "600px",
        }}
      >
        Ласкаво просимо на аукціон Artilith! Тут ви знайдете різноманітні предмети, які стануть у пригоді на вашому шляху. Ставте ставки і отримуйте вигоду!
      </p>

      {/* Список предметів на аукціоні */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          width: "100%",
          maxWidth: "1200px",
        }}
      >
        {/* Предмет 1: Меч */}
        <div
          style={{
            backgroundColor: "#222",
            borderRadius: "10px",
            padding: "20px",
            textAlign: "center",
            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <h2 style={{ color: "#00ffcc", marginBottom: "10px" }}>🗡️</h2>
          <h3 style={{ color: "#00ffcc", marginBottom: "10px" }}>Меч сталевий</h3>
          <p style={{ color: "#ddd", marginBottom: "15px" }}>Ідеальний для боротьби з монстрами. Підвищує атакувальні здібності.</p>
          <p style={{ color: "#fff", fontSize: "1.2rem", fontWeight: "bold" }}>Стартова ціна: 30 ARTL</p>
          <button
            style={{
              backgroundColor: "#00bcd4",
              border: "none",
              padding: "12px 24px",
              fontSize: "1rem",
              color: "#fff",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginTop: "10px",
            }}
            onClick={() => alert("Ваша ставка на Меч сталевий!")}
          >
            Зробити ставку
          </button>
        </div>

        {/* Предмет 2: Щит */}
        <div
          style={{
            backgroundColor: "#222",
            borderRadius: "10px",
            padding: "20px",
            textAlign: "center",
            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          
          <h3 style={{ color: "#00ffcc", marginBottom: "10px" }}>Щит захисний</h3>
          <p style={{ color: "#ddd", marginBottom: "15px" }}>Дозволяє зменшувати шкоду від атак. Потрібен кожному воїну.</p>
          <p style={{ color: "#fff", fontSize: "1.2rem", fontWeight: "bold" }}>Стартова ціна: 50 ARTL</p>
          <button
            style={{
              backgroundColor: "#00bcd4",
              border: "none",
              padding: "12px 24px",
              fontSize: "1rem",
              color: "#fff",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginTop: "10px",
            }}
            onClick={() => alert("Ваша ставка на Щит захисний!")}
          >
            Зробити ставку
          </button>
        </div>
      </div>
    </div>
  </Placeholder>
</div>

        );
      case 'home':
        return (
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
                  marginBottom: "20px",
                  marginTop: "5px",
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
                  marginTop: "0px",
                  marginBottom: "0px",
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
                  width: "100%",
                  height: "auto",
                  maxWidth: "300px", // для мобілки
                }}
                />
              </div>
              <p
              style={{
                fontSize: "1.1rem",
                fontWeight: "lighter",
                color: "#ccc",
                textAlign: "center",
                lineHeight: "1",
                fontFamily: "Arial, sans-serif",
                marginTop: "0px",
              }}
            >
              <span>
                {countdown > 0 ? `${formatTime(countdown)}` : "Tap to сollect"}
              </span>
            </p>
            </div>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: "lighter",
                color: "#ccc",
                textAlign: "center",
                marginTop: "10px",
                lineHeight: "1.4",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Collect shards to unlock new possibilities and progress faster
            </h2>
          </Placeholder>
          </div>
        );
      case 'soon':
        return (
          <div>
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
                  marginBottom: "20px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ITEM
              </h1>

              <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: "lighter",
                color: "#ccc",
                textAlign: "center",
                marginTop: "10px",
                lineHeight: "1.4",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Comming Soon ...
            </h2>
            </div>
          </Placeholder>
          </div>
        );
      default:
        return null;
    }
  };
  

  return (
    <Page back={false}>
      <List>
        <TopBar points={points} />
        <div style={{ paddingBottom: 100 }}>{renderContent()}</div>
        <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </List>
    </Page>
  );
}
