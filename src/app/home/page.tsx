"use client";

import React, { useEffect, useState, useRef } from "react";
import { List, Placeholder } from "@telegram-apps/telegram-ui";
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import artilithLogo from "../_assets/Artilith_logo-no-bg.png";
import swordr1m3 from "../_assets/sword-r1-m3.png";
import staffr1m3 from "../_assets/staff-r1-m3.png";
import potionmp from "../_assets/potion-mp.png";
import Image from "next/image";
import PageLoader from "next/dist/client/page-loader";


export default function HomePage() {
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000);
  const [isClickable, setIsClickable] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [animationTime, setAnimationTime] = useState(1100);
  const [activeTab, setActiveTab] = useState("home");
  const [locked, setLocked] = useState(true);


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

  type ItemCardProps = {
    name: string;
    image?: string;
    description: string;
    damage?: string;
    strength?: string;
    price: number;
  };
  
  const ItemCard: React.FC<ItemCardProps> = ({ name, image, description, damage, price, strength }) => (
    <div
      style={{
        borderRadius: "10px",
        padding: "20px",
        textAlign: "center",
        boxShadow: "0 2px 9px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
    <img 
      src={image} 
      alt={name} 
      width={150} 
      height={150}
      style={{
        borderRadius: "10px",
        marginBottom: "15px",
        boxShadow: "0 5px 15px rgba(255, 255, 255, 0.3)",
      }}
    />
    <h3 style={{ color: "#00ffcc", marginBottom: "10px" }}>{name}</h3>
    <p style={{ color: "#ddd", marginBottom: "15px" }}>{description}</p>
    {damage && <p style={{ color: "#ddd", marginBottom: "15px" }}>{damage}</p>}
    {strength && <p style={{ color: "#ddd", marginBottom: "15px" }}>{strength}</p>}
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
      onClick={() => alert(`Ви придбали ${name}!`)}
    >
      Купити за : {price} 🪨
    </button>
  </div>
);
  
  
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    const pad = (num: number) => num.toString().padStart(2, "0");
  
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };
  const renderContent = () => {
    switch (activeTab) {
      case 'shop':
        return (
        <Page back>
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
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                МАГАЗИН ПРЕДМЕТІВ
              </h1>

              <p
                style={{
                  fontSize: "1rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "30px",
                  maxWidth: "600px",
                }}
              >
                Тут ви можете придбати початкове спорядження для пригод: зброю, броню та зілля.
              </p>

              {/* Список предметів */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, 1fr)",
                  gap: "20px",
                  width: "100%",
                  maxWidth: "1200px",
                }}
              >
                {/* Меч дерев'яний */}
                <ItemCard
                  name="Деревяна палиця"
                  image={swordr1m3.src}
                  description="Початковий артефакт для воїнів."
                  damage="Шкода: 1"
                  strength="Міцність: 5"
                  price={30}
                />

                {/* Маленьке зілля */}
                <ItemCard
                  name="Маленьке зілля"
                  image={potionmp.src}
                  description="Відновлює енергію. Один ковток — і ви знову в строю."
                  price={50}
                /> 
                
                {/* Палиця мага */}
                <ItemCard
                  name="Магічна палиця"
                  image={staffr1m3.src}
                  description="Початковий артефакт для магів."
                  damage="Шкода: 1-3"
                  strength="Міцність: 4"
                  price={65}
                />
              </div>
            </div>
          </Placeholder>
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
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                Рівень 2
              </h1>

              <p
                style={{
                  fontSize: "1rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "30px",
                  maxWidth: "600px",
                }}
              >
                Ви ще не досить сильні, щоб отримати доступ до цього рівня. Продовжуйте грати, щоб розблокувати нові предмети!
              </p>

              {/* Окремий контейнер тільки для контенту */}
              <div style={{ position: "relative", marginTop: "20px" }}>
                {/* Контент */}
                <div
                  className="blur-target"
                  style={{
                    display: "grid",
                    gap: "20px",
                    width: "100%",
                    maxWidth: "1200px",
                    margin: "0 auto",
                    filter: locked ? "blur(15px)" : "none",
                    transition: "filter 0.3s ease",
                  }}
                >
                  {/* Твої ItemCard-и */}
                  <ItemCard
                    name="Хитрун"
                    image={swordr1m3.src}
                    description="Хитрун"
                    damage="Шкода: Хитрун"
                    strength="Міцність: Хитрун"
                    price={999999}
                  />
                </div>
              </div>
            </div>
          </Placeholder>
        </Page>
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
                  fontSize: "2rem",
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
                  maxWidth: "250px", // для мобілки
                }}
                />
              </div>
              <p
              style={{
                fontSize: "0.9rem",
                fontWeight: "lighter",
                color: "#ccc",
                textAlign: "center",
                lineHeight: "1",
                fontFamily: "Arial, sans-serif",
                marginTop: "0px",
              }}
              >
                <span>
                  {countdown > 0 ? `${formatTime(countdown)}` : "Тисни, щоб отримати уламок!"}
                </span>
              </p>
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: "lighter",
                  color: "#ccc",
                  textAlign: "center",
                  marginTop: "10px",
                  lineHeight: "1.4",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Збирайте уламки, щоб прокачати свого героя та підготувати його до пригод.
              </h2>
            </div>
          </Placeholder>
          </div>
        );
      case 'hiro':
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
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ГЕРОЙ
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
              Тут ви можете налаштувати свого героя, прокачати його та підготувати до пригод.
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
