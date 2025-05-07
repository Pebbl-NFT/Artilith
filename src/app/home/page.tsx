"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  List,
  Placeholder,
  Button,
  Card,
} from "@telegram-apps/telegram-ui";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

// Компоненти
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import { ItemCard } from "@/components/ItemCard";

// Дані та логіка
import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";
import { formatTime } from "@/utils/formatTime";
import { getPlayerStats } from "@/utils/getPlayerStats";
import { updateUserPoints } from "@/hooks/useUserPoints";
import {addInventoryItem} from "@/hooks/useItemActions";

// Зображення
import artilithLogo from "../_assets/Artilith_logo-no-bg.png";
import sword01a from "../_assets/item/sword01a.png";


export default function HomePage() {
  // Кількість уламків (points)
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000);
  const [isClickable, setIsClickable] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [animationTime, setAnimationTime] = useState(1100);
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [energy, setEnergy] = useState(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [heroStats, setHeroStats] = useState({
    health: 10,
    attack: 1,
    defense: 0,
  });

  // Перемикач, який показує заблокований контент (наприклад, рівень 2)
  const [locked, setLocked] = useState(true);

  // Модальне вікно для підтвердження покупки
  const [selectedItem, setSelectedItem] = useState<SelectedItemType>(null);
  type SelectedItemType = {
    item_id: number;
    type: string;
    name: string;
    image: string;
    description: string;
    damage?: string;
    strength?: string;
    price: number;
  } | null;

  // Завантажуємо дані користувача із Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("users")
        .select("points, click_delay, energy")
        .eq("id", userId)
        .single();
  
      if (error) {
        console.error("Помилка завантаження даних:", error);
      } else if (data) {
        setPoints(data.points);
        setClickDelay(data.click_delay);
        setEnergy(data.energy);
        setAnimationTime(data.click_delay + 100);
      }
    };
    fetchUserData();
  }, [userId]);  


  // підтвердження покупки
  const confirmBuy = async () => {
    if (selectedItem) {
      await handleBuyItem(selectedItem);
      setSelectedItem(null);
    }
  };

  // Функція обробки покупки
  const handleBuyItem = async (item: { item_id: number; type:string; name: string; image: string; description: string; damage?: string; strength?: string; price: number }) => {
    if (points < item.price) {
      toast.error("Недостатньо уламків для покупки!");
      return;
    }

    if (!userId) {
      toast.error('Користувач не знайдений!');
      return;
    }

    // Додаємо предмет
    const added = await addInventoryItem(String(userId), item.item_id, item.name);
    if (added) {
      const newPoints = points - item.price;
      await updateUserPoints(String(userId), newPoints);
      setPoints(newPoints);

      toast.success(`Ви придбали ${item.name}!`);
    } else {
      toast.error(`Ви вже маєте ${item.name} або сталася помилка!`);
    }
  };

  // Оновлення таймера для кліку
  const updateCountdown = (endTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const now = Date.now();
    let remaining = Math.ceil((endTime - now) / 1000);

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
      remaining = Math.ceil((endTime - now) / 1000);

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

  // Клік на "HOLD"
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

    if (!userId) return;

    const { error } = await supabase
      .from("users")
      .upsert([{ id: userId, points: newPoints, click_delay: newClickDelay }], {
        onConflict: "id",
      });

    if (error) console.error("Помилка збереження:", error);

    const imgWrap = document.querySelector(".imgWrap");
    if (imgWrap) {
      imgWrap.classList.add("active");
      setTimeout(() => {
        imgWrap.classList.remove("active");
      }, 1000);
    }
  };

  // Функція обрахунку характеристик героя
  const updateHeroStats = useCallback(() => {
    const stats = getPlayerStats(inventory);
    setHeroStats(stats);
  }, [inventory]);
  
  // Функція додавання предмета в інвентар
  const fetchInventory = async () => {
    if (!userId) return;
    setLoading(true);
  
    const { data, error } = await supabase
      .from("inventory")
      .select(`
        id,
        item_id,
        equipped
      `)
      .eq("user_id", userId);
  
    if (error) {
      console.error("Помилка при завантаженні інвентаря:", error.message);
      setLoading(false);
      return;
    }
  
    if (data) {
      const formatted = data.map((entry) => {
        const item = AllItems.find((i) => i.item_id === entry.item_id);
        return {
          ...item,
          id: entry.id, // унікальний id інстансу предмета
          equipped: entry.equipped ?? false,
        };
      });      
  
      console.log("Форматований інвентар:", formatted);
      setInventory(formatted);
    }
  
    setLoading(false);
  };

  const toggleEquip = async (index: number) => {
    const selectedItem = inventory[index];
    if (!selectedItem || !userId) return;
  
    const itemType = selectedItem.type;
  
    if (selectedItem.equipped) {
      await supabase
        .from('inventory')
        .update({ equipped: false })
        .eq('user_id', userId)
        .eq('id', selectedItem.id); // зміна тут
    } else {
      // Зняти всі предмети такого типу
      const idsToUnequip = inventory
        .filter(item => item.type === itemType && item.equipped)
        .map(item => item.id);
  
      if (idsToUnequip.length > 0) {
        await supabase
          .from('inventory')
          .update({ equipped: false })
          .eq('user_id', userId)
          .in('id', idsToUnequip);
      }
  
      // Екіпірувати поточний
      await supabase
        .from('inventory')
        .update({ equipped: true })
        .eq('user_id', userId)
        .eq('id', selectedItem.id); // зміна тут
    }
  
    await fetchInventory();
  };

  // Завантажуємо інвентар при зміні userId
  useEffect(() => {
    if (activeTab === "hero" && userId) {
      fetchInventory();
    }
  }, [activeTab, userId]);

  useEffect(() => {
    updateHeroStats();
  }, [inventory, updateHeroStats]); 


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
                marginTop: "50px",
                animation: "fadeIn 1s ease forwards",
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
                  animation: "fadeIn 1s ease forwards",
                }}
              >
                {AllItems.map((item) => (
                  <ItemCard
                    key={item.item_id}
                    item_id={item.item_id}
                    type={item.type}
                    rarity={item.rarity}
                    name={item.name}
                    image={item.image}
                    description={item.description}
                    damage={item.damage ? `Шкода: ${item.damage}` : ""}
                    strength={item.defense ? `Захист: ${item.defense}` : ""}
                    price={item.price}
                    onBuyRequest={(item) => setSelectedItem(item)}
                  />
                ))}
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
                    item_id={0}
                    type="weapon"
                    name="Хитрун"
                    rarity="legendary"
                    image={sword01a.src}
                    description="Хитрун"
                    damage="Шкода: 999999"
                    strength="Міцність: 999999"
                    price={999999}
                    onBuyRequest={(item) => setSelectedItem(item)}
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
                marginTop: "50px",
                width: "100%",
                height: "300px",
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
              Експедиція
              </h1>
              <div
                className="imgWrap"
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginTop: "-20px",
                  marginBottom: "0px",
                  width: "90%",
                  height: "90%",
                }}
              >
                <Image
                  className="blue"
                  alt="Artilith Logo Blue"
                  src={artilithLogo}
                  width={100}
                  height={100}
                  style={{
                    position: "absolute",
                    width: "auto",
                    height: "auto",
                    maxWidth: "200px",
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
                  marginTop: "-20px",
                }}
              >
                <span>
                  {countdown > 0 ? `${formatTime(countdown)}` : "Тисни щоб відправитись на пошуки!"}
                </span>
              </p>
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
                width: "100%",
                height: "100px",
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
              Битва
              </h1>
              <div
                className="imgWrap"
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginTop: "-20px",
                  width: "90%",
                  height: "30%",
                }}
              >
              </div>
              <Link href="/home/battle" style={{
                  fontSize: "0.9rem",
                  fontWeight: "lighter",
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: "1",
                  fontFamily: "Arial, sans-serif",
                }}><p
              >
                Тисни щоб відкрити тестовий бій
              </p>
              </Link>
            </div>
          </Placeholder>
        </div>
      );
    case "hero":
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
                marginTop: "50px",
                animation: "fadeIn 1s ease forwards",
              }}
            >
              <h1 style={{ 
                fontSize: "2rem", 
                fontWeight: "bold", 
                marginBottom: "10px", 
                textAlign: "center", 
                color: "#fff", 
                lineHeight: "1" }}>
                ДІМ</h1>
              <p
                style={{
                  fontSize: "1rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "30px",
                }}
              >
                Тут ви можете налаштувати свого героя, та підготувати до пригод.
              </p>

              <Card className="page">
                <h3>Характеристики</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "20px",
                    marginTop: "20px",
                    color: "#fff",
                    animation: "fadeIn 0.6s ease forwards",
                  }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                      <span>❤️ </span>
                      <span> {heroStats.health}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                      <span>🗡️ </span>
                      <span>{heroStats.attack}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                      <span>🛡️</span>
                      <span>{heroStats.defense}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                      <span>⚡</span>
                      <span>{energy}</span>
                    </div>
                </div>
              </Card>
              
              <h2 style={{ 
                fontSize: "1.4rem", 
                fontWeight: "bold", 
                marginTop: "50px", 
                marginBottom: "40px", 
                textAlign: "center", 
                color: "#fff" }}
              >
                ІНВЕНТАР
              </h2>

              {inventory.length === 0 && (
                <p style={{ fontSize: "1.1rem", fontWeight: "lighter", color: "#ccc", textAlign: "center", marginBottom: "20px", lineHeight: "1.4", fontFamily: "Arial, sans-serif", maxWidth: "90%" }}>
                  Інвентар порожній — купіть предмети в магазині!
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", // адаптуємо колонки
                  gap: "20px",
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                {/* Медіа-запити для адаптації на мобільних пристроях */}
                {inventory.length > 0 &&
                  inventory.map((item, index) => (
                    <div
                      key={index}
                      className={`relative flex flex-col items-center bg-white/[0.05] rounded-lg p-2 animate-fadeIn opacity-0 rarity-${item.rarity?.toLowerCase()}`}
                      style={{
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "10px",
                        padding: "20px",
                        animationDelay: `${index * 0.1}s`,
                        animation: "fadeIn 0.7s ease forwards",
                      }}
                    >
                      <div style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        color: item ? "#fff" : "#777",
                        marginBottom: "10px",
                        position: "relative", // важливо для абсолютного позиціонування rarity-label
                      }}>
                        <div className="rarity-label">
                          {item.rarity?.toUpperCase()}
                        </div>

                        {item?.image ? (
                          <img
                          src={typeof item.image === "string" ? item.image : item.image.src}
                          alt={item.name}
                          className={`item-image rarity-border-${item.rarity?.toLowerCase()}`}
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            padding: "20px",
                            borderRadius: "10px",
                            boxShadow: "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
                            maxWidth: "100%",
                            height: "auto",
                          }}
                        />
                        ) : item?.name ? (
                          item.name
                        ) : (
                          "+"
                        )}
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
                            maxWidth: "150px",
                            marginTop: "-10px",
                          }}
                          onClick={() => toggleEquip(index)}
                        >
                          {item.equipped ? "Скинути" : "Екіпірувати"}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </Placeholder>
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
        {selectedItem && (
            <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Підтвердження покупки</h3>
                <p>Придбати <strong>{selectedItem.name}</strong> за <strong>{selectedItem.price}</strong> уламків?</p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button onClick={confirmBuy}>Так</button>
                  <button onClick={() => setSelectedItem(null)}>Ні</button>
                </div>
              </div>
            </div>
          )}
        <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </List>
      <Toaster position="top-center" reverseOrder={false} />
    </Page>
  );

}
