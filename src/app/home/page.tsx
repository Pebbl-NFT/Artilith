"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import EquippedItemSlot from "@/components/Item/EquippedItemSlot";

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
  const [experience, setExperience] = useState(0);
  const [level, setLevel] = useState(1);



  const username = useMemo(() => {
      return initDataState?.user?.firstName || 'User';
    }, [initDataState]);

  const [heroStats, setHeroStats] = useState({
    health: 10,
    attack: 1,
    defense: 0,
  });

  // Функція для розрахунку досвіду
  const getRequiredExp = (level: number): number => {
    return 100 * Math.pow(2, level - 1); // 1 lvl = 100 XP, 2 lvl = 200, 3 lvl = 400 і т.д.
  };
  
  // Перемикач, який показує заблокований контент (наприклад, рівень 2)
  const [locked, setLocked] = useState(true);

  // Модальне вікно для підтвердження покупки
  const [selectedItem, setSelectedItem] = useState<SelectedItemType>(null);
  type SelectedItemType = {
    mode: "city" | "inventory" | "equipped";
    item_id: number;
    type: string;
    name: string;
    image: string;
    description: string;
    damage?: string;
    defense?: string;
    strength?: string;
    price: number;
    rarity?: string;
  } | null;

  // Завантажуємо дані користувача із Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("users")
        .select("points, click_delay, energy, experience, level")
        .eq("id", userId)
        .single();

  
      if (error) {
        console.error("Помилка завантаження даних:", error);
      } else if (data) {
        setPoints(data.points);
        setClickDelay(data.click_delay);
        setEnergy(data.energy);
        setAnimationTime(data.click_delay + 100);
        setExperience(data.experience ?? 0);
        setLevel(data.level ?? 1);
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

    const xpGain = 1; // Кожен клік — 1 XP
      let newExperience = experience + xpGain;
      let newLevel = level;

      while (newExperience >= getRequiredExp(newLevel)) {
        newExperience -= getRequiredExp(newLevel);
        newLevel++;
        toast.success(`🎉 Новий рівень! Тепер ви рівень ${newLevel}`);
      }

      setExperience(newExperience);
      setLevel(newLevel);

    await supabase
      .from("users")
      .upsert([
        {
          id: userId,
          points: newPoints,
          click_delay: newClickDelay,
          experience: newExperience,
          level: newLevel,
        },
      ], { onConflict: "id" });

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
    if (activeTab === "home" && userId) {
      fetchInventory();
    }
  }, [activeTab, userId]);

  useEffect(() => {
    updateHeroStats();
  }, [inventory, updateHeroStats]); 
  
  

  // Функція рендеринга контенту для різних вкладок
  const renderContent = () => {
  switch (activeTab) {
    case "city":
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
                  fontSize: "0.8rem",
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
                    mode={"city"}
                    key={item.item_id}
                    item_id={item.item_id}
                    type={item.type}
                    rarity={item.rarity}
                    name={item.name}
                    image={item.image}
                    description={item.description}
                    damage={item.damage ? `Шкода: ${item.damage}` : ""}
                    defense={item.defense ? `Захист: ${item.defense}` : ""}
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
                    mode={"city"}
                    item_id={0}
                    type="weapon"
                    name="Хитрун"
                    rarity="legendary"
                    image={sword01a.src}
                    description="Хитрун"
                    damage="Шкода: 999999"
                    defense="Міцність: 999999"
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
      const equippedItems = inventory.filter(item => item.equipped);
      const unequippedItems = inventory.filter(item => !item.equipped);
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
                animation: "fadeIn 0.6s ease forwards",
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
                  fontSize: "0.8rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "30px",
                }}
              >
                Тут ви можете налаштувати свого героя, та підготувати до пригод.
              </p>

              <Card className="page">
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: -30,
                  gap: "30px",
                  padding: 10,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                }}>
                  <p>{username}</p><p>Lv. {level}</p>
                </div>

                {/* Досвід */}
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 10,
                  gap: "10px",
                  padding: 10,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                  }}>
                  <p>🔷 XP :</p>
                  <strong>{experience} / {getRequiredExp(level)} 🔷</strong>
                </div>

                <div style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -50,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                }}>
                  <img 
                    src="/hero/heroidle.gif" 
                    alt="Персонаж" 
                    style={{ width: 220, height: 220, objectFit: "contain" , marginLeft:-50,}}
                  />

                  {/* Слоти для екіпіровки */}
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "0%",
                    transform: "translate(-80%, -50%)",
                    display: "grid",
                    gridTemplateColumns: "repeat(1, 1fr)",
                    gap: -10
                  }}>
                    <EquippedItemSlot
                      item={equippedItems.find(i => i.type === "weapon")}
                      fallbackIcon=""
                      size={25}
                      onClick={() => {
                        const item = equippedItems.find(i => i.type === "weapon");
                        if (item) setSelectedItem({ ...item, mode: "equipped" });
                      }}
                    />

                    <EquippedItemSlot
                      item={equippedItems.find(i => i.type === "shield")}
                      fallbackIcon=""
                      size={25}
                      onClick={() => {
                        const item = equippedItems.find(i => i.type === "shield");
                        if (item) setSelectedItem({ ...item, mode: "equipped" });
                      }}
                    />
                  </div>
                </div>

                {/* Статистики героя */}
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "30px",
                  padding: 10,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                    <span>❤️ </span>
                    <span>{heroStats.health}</span>
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

                <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop:20,
                      fontSize: 12,
                      gap: "30px",
                      padding:10,
                      color: "#fff",
                      animation: "fadeIn 0.6s ease forwards",
                    }}
                    >

                    <Button style={{
                    border:"1px solid rgb(99, 99, 99)",
                    backgroundColor:"rgba(0, 0, 0, 0)",
                    borderRadius: 8,
                    }}>

                    Здібності</Button>
                    <Link href="/home/profile">
                      <Button style={{
                        border:"1px solid rgb(99, 99, 99)",
                        backgroundColor:"rgba(0, 0, 0, 0)",
                        borderRadius: 8,
                        }}>
                        📜<span
                        style={{
                          position: 'absolute',
                          top: -5,
                          right: -4,
                          width: 8,
                          height: 8,
                          backgroundColor: '#ff3b30',
                          borderRadius: '50%',
                          border: '1px solid white',
                        }}
                      />
                      </Button>
                    </Link>
                    <Button style={{
                    border:"1px solid rgb(99, 99, 99)",
                    backgroundColor:"rgba(0, 0, 0, 0)",
                    borderRadius: 8,
                    }}>
                    Завдання</Button>
                </div>
              </Card>

              
              <h2 style={{ 
                fontSize: "1rem", 
                fontWeight: "bold", 
                marginTop: "50px", 
                marginBottom: "40px", 
                textAlign: "center", 
                color: "#fff" }}
              >
                ІНВЕНТАР
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", // адаптуємо колонки
                  gap: "20px",
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                {inventory.length === 0 && (
                <p style={{ fontSize: "1rem", fontWeight: "lighter", color: "#ccc", textAlign: "center", marginBottom: "20px", lineHeight: "1.4", fontFamily: "Arial, sans-serif", maxWidth: "100%" }}>
                  Інвентар порожній — купіть предмети в магазині!
                </p>
                )}
                {unequippedItems.map((item, index) => (
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
                            padding: "10px",
                            borderRadius: "10px",
                            marginTop: 10,
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
                            padding: "5px",
                            fontSize: "11px",
                            cursor: "pointer",
                            transition: "background-color 0.3s",
                            width: "100%",
                            marginTop: "10px",
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
    case "adventures":
      return (
        <div
        >
          <Placeholder className="HIJtihMA8FHczS02iWF5"
          style={{ overflow: "visible" }}
          onClick={handleClick}>
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "50px",
                width: "100%",
                height: "170px",
                paddingBottom: 60,
                paddingTop: 40,
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1rem",
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
                  width: "100%",
                  height: "100%",
                }}
              >
                <Image
                  className="blue"
                  alt="Artilith Logo Blue"
                  src={artilithLogo}
                  width={50}
                  height={50}
                  style={{
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
                  marginTop: "-10px",
                  marginBottom: 20,
                }}
              >
                <span>
                  {countdown > 0 ? `${formatTime(countdown)}` : "Тисни щоб відправитись на пошуки! "}
                </span>
              </p>
                <span>
                1🪨 / 1🔷
                </span>
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
                height: "90px",
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
              Тренування
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
                }}>
                  <Button
              style={{animation: "fadeIn 0.6s ease forwards", backgroundColor: "#4caf50" }}
            >
              ⚔️ Почати бій ⚔️
            </Button>
              </Link>
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
                height: "90px",
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
              В розробці
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
              <Link href="" style={{
                  fontSize: "0.9rem",
                  fontWeight: "lighter",
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: "1",
                  fontFamily: "Arial, sans-serif",
                }}>
                  <Button
              style={{animation: "fadeIn 0.6s ease forwards", backgroundColor: "#4caf50" }}
            >
              ⚔️
            </Button>
              </Link>
            </div>
          </Placeholder>
        </div>
      );
    default:
      return null;
  }
  };

  async function handleEquip(selectedItem: { mode: "city" | "inventory" | "equipped"; item_id: number; type: string; name: string; image: string; description: string; damage?: string; strength?: string; price: number; }) {
    if (!userId) {
      toast.error("Користувач не знайдений!");
      return;
    }

    // Знайти індекс предмета в inventory
    const index = inventory.findIndex(
      (item) => item.item_id === selectedItem.item_id && !item.equipped
    );
    if (index === -1) {
      toast.error("Предмет не знайдено в інвентарі!");
      return;
    }

    // Зняти всі предмети такого типу
    const idsToUnequip = inventory
      .filter(item => item.type === selectedItem.type && item.equipped)
      .map(item => item.id);

    if (idsToUnequip.length > 0) {
      await supabase
        .from('inventory')
        .update({ equipped: false })
        .eq('user_id', userId)
        .in('id', idsToUnequip);
    }

    // Екіпірувати вибраний предмет
    await supabase
      .from('inventory')
      .update({ equipped: true })
      .eq('user_id', userId)
      .eq('id', inventory[index].id);

    toast.success(`Ви екіпірували ${selectedItem.name}!`);
    await fetchInventory();
  }

  async function handleDismantle(selectedItem: { mode: "city" | "inventory" | "equipped"; item_id: number; type: string; name: string; image: string; description: string; damage?: string; strength?: string; price: number; }) {
    if (!userId) {
      toast.error("Користувач не знайдений!");
      return;
    }

    // Знайти інстанс предмета в inventory
    const itemInstance = inventory.find(
      (item) => item.item_id === selectedItem.item_id && !item.equipped
    );
    if (!itemInstance) {
      toast.error("Предмет не знайдено в інвентарі!");
      return;
    }

    // Видалити предмет з інвентаря
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("user_id", userId)
      .eq("id", itemInstance.id);

    if (error) {
      toast.error("Не вдалося розібрати предмет!");
      return;
    }

    // Дати гравцю частину ціни предмета (наприклад, 50%)
    const dismantleReward = Math.floor(selectedItem.price * 0.5);
    const newPoints = points + dismantleReward;

    await updateUserPoints(String(userId), newPoints);
    setPoints(newPoints);

    toast.success(`Ви розібрали ${selectedItem.name} і отримали ${dismantleReward} уламків!`);
    await fetchInventory();
  }

  async function handleUnequip(selectedItem: { mode: "city" | "inventory" | "equipped"; item_id: number; type: string; name: string; image: string; description: string; damage?: string; strength?: string; price: number; }) {
    if (!userId) {
      toast.error("Користувач не знайдений!");
      return;
    }

    // Знайти інстанс предмета в inventory, який екіпіровано
    const itemInstance = inventory.find(
      (item) => item.item_id === selectedItem.item_id && item.equipped
    );
    if (!itemInstance) {
      toast.error("Екіпірований предмет не знайдено!");
      return;
    }

    // Зняти екіпіровку
    const { error } = await supabase
      .from("inventory")
      .update({ equipped: false })
      .eq("user_id", userId)
      .eq("id", itemInstance.id);

    if (error) {
      toast.error("Не вдалося зняти екіпіровку!");
      return;
    }

    toast.success(`Ви зняли ${selectedItem.name}!`);
    await fetchInventory();
  }

  return (
    <Page back={false}>
      <List>
        <TopBar points={points} />
        <div style={{ paddingBottom: 100 }}>{renderContent()}</div>
        {selectedItem && (
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
              
              {selectedItem.mode === "city" && (
                <>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <p>Придбати <strong>{selectedItem.name}</strong> за <strong>{selectedItem.price}</strong> уламків?</p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "50px" }}>
                    <button onClick={() => {
                      confirmBuy();
                      setSelectedItem(null);
                    }}>Так</button>
                    <button onClick={() => setSelectedItem(null)}>Ні</button>
                  </div>
                </div>
                </>
              )}

              {selectedItem.mode === "inventory" && (
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button onClick={() => {
                    handleEquip(selectedItem);
                    setSelectedItem(null);
                  }}>🛡️ Спорядити</button>
                  <button onClick={() => {
                    handleDismantle(selectedItem);
                    setSelectedItem(null);
                  }}>🧨 Розібрати</button>
                </div>
              )}

              {selectedItem.mode === "equipped" && (
                <div
                  className={`item-image rarity-border-${selectedItem.rarity?.toLowerCase()}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: "#1e1e1e",
                    padding: "20px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "90%",
                    textAlign: "center",
                    boxShadow: "0 0 10px rgba(253, 253, 253, 0.5)",
                  }}
                >
                  <h2 className={` rarity-border-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{selectedItem.name}</h2>
                  {selectedItem.image && (
                    <img
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "50px", height: "50px", objectFit: "contain", marginBottom: "30px", marginTop: "20px" }}
                    />
                  )}
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px" }}>
                    Тип: <strong>{selectedItem.type}</strong>
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px" }}>
                    Рідкість: <strong>{selectedItem.rarity}</strong>
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px" }}>
                    Шкода: <strong>{selectedItem.damage}</strong>
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px" }}>
                    Захист: <strong>{selectedItem.defense}</strong>
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px" }}>
                    Рівень: 1
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px" }}>
                    Міцність: 10 / 10
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "50px", marginTop: "50px" }}>
                    <button onClick={() => {handleUnequip(selectedItem);setSelectedItem(null);}}
                        style={{
                          backgroundColor: "#444",
                          padding: "8px 12px",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          marginTop: "10px",
                          cursor: "pointer",
                        }}>
                          🗑️ Зняти </button>

                      <button onClick={() => setSelectedItem(null)}
                        style={{
                          backgroundColor: "#444",
                          padding: "8px 12px",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          marginTop: "10px",
                          cursor: "pointer",
                        }}>
                            Закрити </button>
                  </div>
                </div>
              )}
            </div>
        )}

        <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </List>
      <Toaster position="top-center" reverseOrder={false} />
    </Page>
  );

}
