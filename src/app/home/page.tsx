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


export default function HomePage() {
  // Кількість уламків (points)
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000);
  const [isClickable, setIsClickable] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [animationTime, setAnimationTime] = useState(1100);
  const [activeTab, setActiveTab] = useState("home");
  // Для магазину використовується сортування (вже інтегровано)
  const [sortOption, setSortOption] = useState("price");
  // Перемикач, який показує заблокований контент (наприклад, рівень 2)
  const [locked, setLocked] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

    // Завантажуємо дані користувача із Supabase
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

  // Оновити кількість балів
async function updateUserPoints(userId: string, newPoints: number): Promise<void> {
  const { data, error } = await supabase
    .from('users') // заміни на реальну назву таблиці, якщо потрібно
    .update({ points: newPoints })
    .eq('id', userId);

  if (error) {
    console.error('Помилка оновлення балів:', error);
  } else {
    console.log('Оновлено користувача:', data);
  }
}

// Додати предмет у інвентар
async function addInventoryItem(userId: string, item: string): Promise<boolean> { 
  const { data, error } = await supabase
    .from('inventory')
    .insert([{ user_id: userId, item: item }]);

    if (error) {
      console.error('Помилка додавання предмета:', error);
      return false;
    } else {
      console.log('Додано предмет в інвентар:', data);
      return true;
    }    
}

  // Функція обробки покупки
  const handleBuyItem = async (
    item: { name: string; image: string; description: string; damage?: string; strength?: string; price: number }
  ) => {
    if (points < item.price) {
      alert("Недостатньо уламків для покупки!");
      return;
    }
  
    const newPoints = points - item.price;
    await updateUserPoints(userId, newPoints); // <-- userId додаємо
    setPoints(newPoints);
  
    const added = await addInventoryItem(userId, item.name); // <-- userId і item.name
    if (added) {
      alert(`Ви придбали ${item.name}!`);
      // Можна оновити локальний інвентар тут
    } else {
      alert("Помилка покупки!");
    }
  };
  
  const saveUserData = async (newPoints: number, newClickDelay: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from("users")
      .upsert([{ id: userId, points: newPoints, click_delay: newClickDelay }], {
        onConflict: "id",
      });

    if (error) console.error("Помилка збереження:", error);
  };

  // Функція оновлення таймера для кліку (залишається незмінною)
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

  // При кліку на "HOLD" (збирати уламки)
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
    // Оновлюємо базу із новими даними
    const { error } = await supabase
      .from("users")
      .upsert([{ id: userId, points: newPoints, click_delay: newClickDelay }], {
        onConflict: "id",
      });
    if (error) console.error("Помилка збереження:", error);
    // Клас для пульсації
    const imgWrap = document.querySelector(".imgWrap");
    if (imgWrap) {
      imgWrap.classList.add("active");
      setTimeout(() => {
        imgWrap.classList.remove("active");
      }, 1000);
    }
  };

  // Компонент ItemCard: оновлено для роботи з зображенням (image)
  type ItemCardProps = {
    name: string;
    image: string;
    description: string;
    damage?: string;
    strength?: string;
    price: number;
  };
  const ItemCard: React.FC<ItemCardProps> = ({ name, image, description, damage, strength, price }) => (
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
      {damage && <p style={{ color: "#ddd", marginBottom: "5px" }}>{damage}</p>}
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
        onClick={() => handleBuyItem({ name, image, description, damage, strength, price })}
      >
        Купити за {price} 🪨
      </button>
    </div>
  );
  
  
 // Функція форматування таймера
 const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

 // Функція рендеринга контенту для різних вкладок
 const renderContent = () => {
  switch (activeTab) {
    case "shop":
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, 1fr)",
                  gap: "20px",
                  width: "100%",
                  maxWidth: "1200px",
                }}
              >
                <ItemCard
                  name="Деревяна палиця"
                  image={swordr1m3.src}
                  description="Початковий артефакт для воїнів."
                  damage="Шкода: 1"
                  strength="Міцність: 5"
                  price={30}
                />
                <ItemCard
                  name="Маленьке зілля"
                  image={potionmp.src}
                  description="Відновлює енергію. Один ковток — і ви знову в строю."
                  price={50}
                />
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
              <div style={{ position: "relative", marginTop: "20px" }}>
                <div
                  className="blur-target"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(1, 1fr)",
                    gap: "20px",
                    width: "100%",
                    maxWidth: "1200px",
                    margin: "0 auto",
                    filter: locked ? "blur(15px)" : "none",
                    transition: "filter 0.3s ease",
                    pointerEvents: locked ? "none" : "auto",
                    opacity: locked ? 0.5 : 1,
                    cursor: locked ? "block" : "auto",
                  }}
                >
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
    case "home":
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
                    maxWidth: "250px",
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
    case "hiro":
      // Уявний інвентар гравця
      const inventory = [
        { id: 1, name: "Деревяна палиця", equipped: false },
        { id: 2, name: "Маленький щит", equipped: true },
        null,
        null,
      ];
      return (
        <Page back>
          <Placeholder>
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "-20px",
              }}
            >
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginBottom: "10px",
                  textAlign: "center",
                  color: "#fff",
                  lineHeight: "1",
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
                  marginBottom: "20px",
                  lineHeight: "1.4",
                  fontFamily: "Arial, sans-serif",
                  maxWidth: "90%",
                }}
              >
                Тут ви можете налаштувати свого героя, прокачати його та підготувати до пригод.
              </h2>
              {/* Блок героя */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "15px",
                  padding: "20px",
                  width: "100%",
                  maxWidth: "400px",
                  boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                  position: "relative",
                  overflow: "hidden",
                  marginBottom: "40px",
                }}
              >
                {/* Зображення героя */}
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    marginBottom: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "60px", color: "#fff" }}>🛡️</span>
                </div>
                {/* Статистика героя */}
                <div
                  style={{
                    width: "100%",
                    color: "#fff",
                    fontSize: "1rem",
                    textAlign: "left",
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Рівень:</strong> 0
                  </div>
                  {/* Індикатор Здоровя */}
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Здоров&apos;я:</strong>
                    <div
                      style={{
                        width: "100%",
                        height: "12px",
                        backgroundColor: "#444",
                        borderRadius: "6px",
                        overflow: "hidden",
                        marginTop: "5px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "linear-gradient(to right, #4caf50, #8bc34a)",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Захист:</strong> 0
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Шкода:</strong> 0
                  </div>
                </div>
              </div>
              {/* Інвентар */}
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  marginTop: "30px",
                  marginBottom: "10px",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                Інвентар
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "15px",
                  width: "100%",
                  maxWidth: "400px",
                }}
              >
                {inventory.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "10px",
                      padding: "10px",
                      position: "relative",
                      animation: "fadeIn 0.5s ease forwards",
                      animationDelay: `${index * 0.1}s`,
                      opacity: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        backgroundColor: item
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.02)",
                        border: item
                          ? "2px solid rgba(255, 255, 255, 0.3)"
                          : "2px dashed rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        color: item ? "#fff" : "#777",
                        marginBottom: "10px",
                      }}
                    >
                      {item ? item.name : "Порожньо"}
                    </div>
                    {item && (
                      <button
                        style={{
                          backgroundColor: item.equipped ? "#f44336" : "#4caf50",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          padding: "5px 10px",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "background-color 0.3s",
                          width: "100%",
                        }}
                        onClick={() =>
                          alert(
                            item.equipped ? `Скинути ${item.name}` : `Екіпірувати ${item.name}`
                          )
                        }
                      >
                        {item.equipped ? "Скинути" : "Екіпірувати"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Placeholder>

          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </Page>
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
