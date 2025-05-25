"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo,  } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import InventoryItemSlot from "@/components/Item/InventoryItemSlot";

// Дані та логіка
import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";
import { WeaponItems } from "@/components/Item/WeaponItem";
import { ShieldItems } from "@/components/Item/ShieldItem";
import { formatTime } from "@/utils/formatTime";
import { getPlayerStats } from "@/utils/getPlayerStats";
import { updateUserPoints } from "@/hooks/useUserPoints";
import {addInventoryItem} from "@/hooks/useItemActions";

// Зображення
import victim from "../_assets/victim.png";
import travel from "../_assets/travel.png";
import sword01a from "../_assets/item/sword01a.png";
import citybg from '../_assets/citybg.jpg';
import shopbg from '../_assets/shopbg.jpg';
import blacksmithbg from '../_assets/blacksmithbg.jpg';
import alleyofheroesnbg from '../_assets/alleyofheroesnbg.jpg';


export default function HomePage() {
  // Кількість уламків (points)
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000);
  const [isClickable, setIsClickable] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [energy, setEnergy] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;
  const [experience, setExperience] = useState(0);
  const [level, setLevel] = useState(1);
  const router = useRouter();




  const username = useMemo(() => {
      return initDataState?.user?.firstName || 'User';
    }, [initDataState]);

  const [heroStats, setHeroStats] = useState({
    health: 20,
    attack: 1,
    defense: 0,
  });

  // Функція для розрахунку досвіду
  const getRequiredExp = (level: number): number => {
    return 100 * Math.pow(2, level - 1); // 1 lvl = 100 XP, 2 lvl = 200, 3 lvl = 400 і т.д.
  };

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
        setEnergy(data.energy); // Встановлюємо енергію користувача
        setExperience(data.experience ?? 0);
        setLevel(data.level ?? 1);
      }
    };
    
    fetchUserData();
  }, [userId]);
  
  // Завантаження рейтингу гравців
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, level")
        .order("level", { ascending: false }); // Сортуємо за рівнем
      if (error) {
        console.error("Помилка завантаження гравців:", error);
      } else {
        setPlayers(data);
      }
    };
    fetchPlayers();
  }, []); // Викликаємо один раз при монтуванні

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
    const newEnergy = (energy ?? 0) + 1; // Додаємо +1 до енергії, якщо energy null, беремо 0
    const newClickDelay = clickDelay + 1000;
    setPoints(newPoints);
    setEnergy(newEnergy); // Оновлюємо стан енергії
    setClickDelay(newClickDelay);
    if (!userId) return;
    const { error } = await supabase
      .from("users")
      .upsert([{ id: userId, points: newPoints, click_delay: newClickDelay, energy: newEnergy }], { // Додаємо energy до оновлення
        onConflict: "id",
      });
    if (error) {
      console.error("Помилка збереження:", error);
    }
    const imgWrap = document.querySelector(".imgWrap");
    if (imgWrap) {
      imgWrap.classList.add("active");
      setTimeout(() => {
        imgWrap.classList.remove("active");
      }, 1000);
    }
    const xpGain = 1; // Кожен клік — +1 XP
    let newExperience = experience + xpGain;
    let newLevel = level;
    // Підвищення рівня
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
          energy: newEnergy, // Додаємо energy до оновлення
          experience: newExperience,
          level: newLevel,
        },
      ], { onConflict: "id" });
      toast.success(`Вам зараховано + 1 🪨`);
      toast.success(`Вам зараховано + 1 ⚡`);
      toast.success(`Вам зараховано + 1 🔷`);
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
  

  const [players, setPlayers] = useState<{ id: any; first_name: any; level: any }[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('user')
        .select('id, first_name, level')
        .order('level', { ascending: false }); // Сортуємо по рівню
      if (error) {
        console.error("Помилка завантаження гравців:", error);
      } else {
        setPlayers(data);
      }
    };
    fetchPlayers();
  }, []);


  // Функція рендеринга контенту для різних вкладок
  const renderContent = () => {
  switch (activeTab) {
    case "city":
      return (
        <Page back >
          <Placeholder style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "20px",
            animation: "fadeIn 1s ease forwards",
            backgroundSize: 'cover', // Покрити весь блок
            backgroundPosition: 'center', // Центрувати зображення
            height: '100%', // Зайняти всю висоту вікна
            color: "#fff", // Текст навколо, щоб бути білішим на фоні
          }} >
            <div onClick={() => setActiveTab("shop")}
              className="page"
              style={{
                backgroundImage: `url(${shopbg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "20px",
                animation: "fadeIn 1s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ТОРГОВЕЦЬ
              </h1>
            </div>
          </Placeholder>
          <Placeholder style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 1s ease forwards",
            marginTop: "-40px",
          }} >
            <div onClick={() => setActiveTab("blacksmith")}
              className="page"
              style={{
                backgroundImage: `url(${blacksmithbg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "20px",
                animation: "fadeIn 1s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                КОВАЛЬ
              </h1>
            </div>
            <div onClick={() => setActiveTab("guild")}
              className="page"
              style={{
                backgroundImage: `url(${citybg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "20px",
                animation: "fadeIn 1s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ГІЛЬДІЯ
              </h1>
            </div>
            <div onClick={() => setActiveTab("alleyofheroes")}
              className="page"
              style={{
                backgroundImage: `url(${alleyofheroesnbg.src})`, 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "20px",
                animation: "fadeIn 1s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                АЛЕЯ ГЕРОЇВ
              </h1>
            </div>
          </Placeholder>
        </Page>
      );
    case "shop":
      return (
        <Page back>
          <Placeholder>
            <div onClick={() => setActiveTab("city")}
              style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "center", 
              marginLeft: "auto",
              marginRight: "auto",}}>
              <p 
                style={{  
                  fontSize: "0.8rem",
                  color: "#ddd",
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  background: "rgba(0, 0, 0, 0.59)",
                  animation: "fadeIn 1s ease forwards",
                  borderRadius: "50px",
                  padding: "10px",
                  paddingInline: "15px",
                  marginBottom: "-40px",
                }}>
                x
              </p>
            </div>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ТОРГОВЕЦЬ
              </h1>
            <div
              className="page"
              style={{
                backgroundImage: `url(${shopbg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 1s ease forwards",
                backgroundSize: 'cover', // Покрити весь блок
                backgroundPosition: 'center', // Центрувати зображення
                height: '100%', // Зайняти всю висоту вікна
                color: "#fff", // Текст навколо, щоб бути білішим на фоні
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "20px",
                  marginTop: "0px",
                  maxWidth: "600px",
                  background: "rgba(0, 0, 0, 0.59)",
                  padding: "5px",
                  animation: "fadeIn 2s ease forwards",
                }}
              >
                Не затримуй мене, я маю багато справ!
              </p>


              <h1
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  marginBottom: "70px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                
              </h1>
              <Card className="page" onClick={() => setActiveTab("weapons")}
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
                gap: "30px",
                padding: 5,
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
                background: "rgba(0, 0, 0, 0.45)",
              }}>
                ЗБРОЯ
              </Card>

              <Card className="page" onClick={() => setActiveTab("shields")}
              style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
              gap: "30px",
              padding: 5,
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
              background: "rgba(0, 0, 0, 0.59)",
            }}>
                БРОНЯ
              </Card>
            </div>
          </Placeholder>
        </Page>
      );
      case "weapons":
        return (
          <Page back>
            <Placeholder>
            <div onClick={() => setActiveTab("city")}
              style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "center", 
              marginLeft: "auto",
              marginRight: "auto",}}>
              <p 
                style={{  
                  fontSize: "0.8rem",
                  color: "#ddd",
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  background: "rgba(0, 0, 0, 0.59)",
                  animation: "fadeIn 1s ease forwards",
                  borderRadius: "50px",
                  padding: "10px",
                  paddingInline: "15px",
                  marginBottom: "-40px",
                }}>
                x
              </p>
            </div>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ТОРГОВЕЦЬ
              </h1>
            <div
              className="page"
              style={{
                backgroundImage: `url(${shopbg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 1s ease forwards",
                backgroundSize: 'cover', // Покрити весь блок
                backgroundPosition: 'center', // Центрувати зображення
                height: '100%', // Зайняти всю висоту вікна
                color: "#fff", // Текст навколо, щоб бути білішим на фоні
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "20px",
                  marginTop: "0px",
                  maxWidth: "600px",
                  background: "rgba(0, 0, 0, 0.59)",
                  padding: "5px",
                  animation: "fadeIn 2s ease forwards",
                }}
              >
                Не затримуй мене, я маю багато справ!
              </p>
              <h1
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  marginBottom: "70px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                
              </h1>
              <Card className="page" onClick={() => setActiveTab("weapons")}
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
                gap: "30px",
                padding: 5,
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
                background: "rgba(0, 0, 0, 0.45)",
              }}>
                ЗБРОЯ
              </Card>

              <Card className="page" onClick={() => setActiveTab("shields")}
              style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
              gap: "30px",
              padding: 5,
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
              background: "rgba(0, 0, 0, 0.59)",
            }}>
                БРОНЯ
              </Card>
            </div>
          </Placeholder>
            <Placeholder>
                <div
                  style={{
                    marginTop: "-30px",
                    marginLeft:"-10px",
                    alignItems: "center",
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", // Адаптивна сітка
                    gap: "20px", // Відступ між картками
                    width: "100%",
                  }}
                >
                  {WeaponItems.map((item) => (
                    <ItemCard
                      mode={"city"}
                      key={item.item_id}
                      item_id={item.item_id}
                      type={item.type}
                      rarity={item.rarity}
                      name={item.name}
                      image={item.image}
                      description={item.description}
                      damage={item.damage ? ` ${item.damage}` : "0"}
                        defense={item.defense ? ` ${item.defense}` : "0"}
                      price={item.price}
                      onBuyRequest={(item) => setSelectedItem(item)}
                    />
                  ))}
                </div>
            </Placeholder>
          </Page>
      );
      case "shields":
          return (
            <Page back>
              <Placeholder>
                <div onClick={() => setActiveTab("city")}
              style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "center", 
              marginLeft: "auto",
              marginRight: "auto",}}>
              <p 
                style={{  
                  fontSize: "0.8rem",
                  color: "#ddd",
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  background: "rgba(0, 0, 0, 0.59)",
                  animation: "fadeIn 1s ease forwards",
                  borderRadius: "50px",
                  padding: "10px",
                  paddingInline: "15px",
                  marginBottom: "-40px",
                }}>
                x
              </p>
            </div>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ТОРГОВЕЦЬ
              </h1>
                <div
                  className="page"
                  style={{
                    backgroundImage: `url(${shopbg.src})`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "fadeIn 1s ease forwards",
                    backgroundSize: 'cover', // Покрити весь блок
                    backgroundPosition: 'center', // Центрувати зображення
                    height: '100%', // Зайняти всю висоту вікна
                    color: "#fff", // Текст навколо, щоб бути білішим на фоні
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#ddd",
                      textAlign: "center",
                      marginBottom: "20px",
                      marginTop: "0px",
                      maxWidth: "600px",
                      background: "rgba(0, 0, 0, 0.59)",
                      padding: "5px",
                      animation: "fadeIn 2s ease forwards",
                    }}
                  >
                    Не затримуй мене, я маю багато справ!
                  </p>
                  <h1
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      marginBottom: "70px",
                      marginTop: "5px",
                      textAlign: "center",
                      lineHeight: "1",
                      color: "#fff",
                    }}
                  >
                    
                  </h1>
                  <Card className="page" onClick={() => setActiveTab("weapons")}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: "30px",
                    padding: 5,
                    color: "#fff",
                    animation: "fadeIn 0.6s ease forwards",
                    background: "rgba(0, 0, 0, 0.45)",
                  }}>
                    ЗБРОЯ
                  </Card>

                  <Card className="page" onClick={() => setActiveTab("shields")}
                  style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 20,
                  gap: "30px",
                  padding: 5,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                  background: "rgba(0, 0, 0, 0.59)",
                }}>
                    БРОНЯ
                  </Card>
                </div>
              </Placeholder>
              <Placeholder>
                  <div
                  style={{
                    marginTop: "-30px",
                    marginLeft:"-10px",
                    alignItems: "center",
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", // Адаптивна сітка
                    gap: "20px", // Відступ між картками
                    width: "100%",
                  }}
                >
                    {ShieldItems.map((item) => (
                      <ItemCard
                        mode={"city"}
                        key={item.item_id}
                        item_id={item.item_id}
                        type={item.type}
                        rarity={item.rarity}
                        name={item.name}
                        image={item.image}
                        description={item.description}
                        damage={item.damage ? ` ${item.damage}` : "0"}
                        defense={item.defense ? `${item.defense}` : "0"}
                        price={item.price}
                        onBuyRequest={(item) => setSelectedItem(item)}
                      />
                    ))}
                  </div>
              </Placeholder>
            </Page>
        );
    case "blacksmith":
      return (
        <Page back>
          <Placeholder>
            <div onClick={() => setActiveTab("city")}
              style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "center", 
              marginLeft: "auto",
              marginRight: "auto",}}>
              <p 
                style={{  
                  fontSize: "0.8rem",
                  color: "#ddd",
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  background: "rgba(0, 0, 0, 0.59)",
                  animation: "fadeIn 1s ease forwards",
                  borderRadius: "50px",
                  padding: "10px",
                  paddingInline: "15px",
                  marginBottom: "-40px",
                }}>
                x
              </p>
            </div>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                КОВАЛЬ
              </h1>
            <div
              className="page"
              style={{
                backgroundImage: `url(${blacksmithbg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 1s ease forwards",
                backgroundSize: 'cover', // Покрити весь блок
                backgroundPosition: 'center', // Центрувати зображення
                height: '100%', // Зайняти всю висоту вікна
                color: "#fff", // Текст навколо, щоб бути білішим на фоні
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginBottom: "20px",
                  marginTop: "0px",
                  maxWidth: "600px",
                  background: "rgba(0, 0, 0, 0.59)",
                  padding: "5px",
                  animation: "fadeIn 3s ease forwards",
                }}
              >
                Знову щось зламав? Я не можу вічно тебе рятувати!
              </p>
              <h1
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  marginBottom: "70px",
                  marginTop: "5px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                
              </h1>
              <Card className="page"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
                gap: "30px",
                padding: 5,
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
                background: "rgba(0, 0, 0, 0.45)",
              }}>
                ВІДРЕМОНТУВАТИ
              </Card>

              <Card className="page" 
              style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
              gap: "30px",
              padding: 5,
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
              background: "rgba(0, 0, 0, 0.59)",
            }}>
                ПОКРАЩИТИ
              </Card>
            </div>
          </Placeholder>
        </Page>
      ); 
    case "guild":
      return (
        <Page back>
          <Placeholder>
            <div onClick={() => setActiveTab("city")}
              style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "center", 
              marginLeft: "auto",
              marginRight: "auto",}}>
              <p 
                style={{  
                  fontSize: "0.8rem",
                  color: "#ddd",
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  background: "rgba(0, 0, 0, 0.59)",
                  animation: "fadeIn 1s ease forwards",
                  borderRadius: "50px",
                  padding: "10px",
                  paddingInline: "15px",
                  marginBottom: "-40px",
                }}>
                x
              </p>
            </div>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                ГІЛЬДІЯ
              </h1>
            <div
              className="page"
              style={{
                backgroundImage: `url(${citybg.src})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 1s ease forwards",
                backgroundSize: 'cover', // Покрити весь блок
                backgroundPosition: 'center', // Центрувати зображення
                height: '100%', // Зайняти всю висоту вікна
                color: "#fff", // Текст навколо, щоб бути білішим на фоні
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginTop: "0px",
                  maxWidth: "600px",
                  background: "rgba(0, 0, 0, 0.59)",
                  padding: "5px",
                  animation: "fadeIn 3s ease forwards",
                }}
              >
                Це місце не для тебе, тут справжні герої!
              </p>
            </div>
          </Placeholder>
          <Placeholder style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 1s ease forwards",
            marginTop: "-40px",
          }} >
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "20px",
                animation: "fadeIn 1s ease forwards",
              }}
            >
              <h1
                style={{
                  fontSize: "1rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                Доступно з 12 рівня
              </h1>
              <h1
                style={{
                  
                  fontSize: "1rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                  marginTop: "40px",
                }}
              >
                Ваш рівень: Lv. {level}
              </h1>
            </div>
          </Placeholder>
        </Page>
      ); 
    case "alleyofheroes":
      return (
        <Page back>
          <Placeholder>
            <div onClick={() => setActiveTab("city")}
              style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "center", 
              marginLeft: "auto",
              marginRight: "auto",}}>
              <p 
                style={{  
                  fontSize: "0.8rem",
                  color: "#ddd",
                  position: "absolute",
                  top: "60px",
                  right: "20px",
                  background: "rgba(0, 0, 0, 0.59)",
                  animation: "fadeIn 1s ease forwards",
                  borderRadius: "50px",
                  padding: "10px",
                  paddingInline: "15px",
                  marginBottom: "-40px",
                }}>
                x
              </p>
            </div>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "20px",
                  textAlign: "center",
                  lineHeight: "1",
                  color: "#fff",
                }}
              >
                АЛЕЯ ГЕРОЇВ
              </h1>
            <div
              className="page"
              style={{
                backgroundImage: `url(${alleyofheroesnbg.src})`, 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 1s ease forwards",
                backgroundSize: 'cover', // Покрити весь блок
                backgroundPosition: 'center', // Центрувати зображення
                height: '100%', // Зайняти всю висоту вікна
                color: "#fff", // Текст навколо, щоб бути білішим на фоні
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#ddd",
                  textAlign: "center",
                  marginTop: "0px",
                  maxWidth: "600px",
                  background: "rgba(0, 0, 0, 0.59)",
                  padding: "5px",
                  animation: "fadeIn 3s ease forwards",
                }}
              >
                Вшануймо шляхетних героїв та їхні подвиги!
              </p>
            </div>
          </Placeholder>
          <Placeholder style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 1s ease forwards",
            marginTop: "-40px",
          }}>
            {/* Відображення рейтингу гравців */}
            {players.map((player, index) => {
              // Визначаємо колір бордера в залежності від позиції
              let borderColor;

              if (index === 0) {
                borderColor = "rgb(255, 152, 0)"; // Для №1
              } else if (index >= 1 && index <= 4) {
                borderColor = "rgb(156, 39, 176)"; // Для №2 - 5
              } else if (index >= 5 && index <= 9) {
                borderColor = "rgb(33, 150, 243)"; // Для №6 - 10
              } else if (index >= 10 && index <= 19) {
                borderColor = "rgb(76, 175, 80)"; // Для №1 - 20
              } else {
                borderColor = "rgb(143, 143, 143)"; // Для №1 - 20
              }
              

              return (
                <div
                  key={player.id}
                  className="page"
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: "rgba(0, 0, 0, 0.52)",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: "10px",
                    animation: "fadeIn 1s ease forwards",
                    gap: "30px",
                    padding: 10,
                  }}
                >
                  <h1
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      lineHeight: "1",
                      color: "#fff",
                    }}
                  >
                    №{index + 1}
                  </h1>
                  <h1
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      lineHeight: "1",
                      color: "#fff",
                    }}
                  >
                    {player.first_name}
                  </h1>
                  <h1
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      lineHeight: "1",
                      color: "#fff",
                    }}
                  >
                    Lv. {player.level}
                  </h1>
                </div>
              );
            })}
          </Placeholder>
        </Page>
      ); 
    case "home":
      const equippedItems = inventory.filter(item => item.equipped);
      const unequippedItems = inventory.filter(item => !item.equipped);
      return (
        <Page back >
          <Placeholder style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "-10px",
                animation: "fadeIn 0.6s ease forwards",
                paddingInline: 10,
              }}>
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
                  marginTop: 10,
                  marginBottom: 30,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                }}>
                  <img 
                    src="/hero/heroidle.png" 
                    alt="Персонаж" 
                    style={{ width: 270, height: 270, objectFit: "contain" , marginRight:-50,
                      marginLeft: -30,
                    }}
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "30px",
                    padding: 10,
                    color: "#fff",
                    animation: "fadeIn 0.6s ease forwards",
                    marginLeft: 20,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>❤️ </span>
                    <span>{heroStats.health}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>🗡️ </span>
                    <span>{heroStats.attack}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>🛡️</span>
                    <span>{heroStats.defense}</span>
                  </div>
                </div>

                <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop:20,
                      fontSize: 5,
                      gap: "20px",
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
                      <p style={{ fontSize: 12, }} >
                        Здібності
                      </p>
                    </Button>
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
                      <p style={{ fontSize: 12, }} >
                        Завдання
                      </p>
                    </Button>
                </div>
              </Card>

                <h2 style={{
                    fontSize: "1rem",
                    fontWeight: "bold",
                    marginTop: "50px",
                    marginBottom: "40px",
                    textAlign: "center",
                    color: "#fff"
                }}>
                  ІНВЕНТАР
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", // Адаптивна сітка
                    gap: "20px", // Відступ між картками
                    width: "100%",
                    margin: "0 auto",
                  }}
                >
                  {/* Повідомлення про порожній інвентар, якщо немає жодного предмета (не тільки неекипірованих) */}
                  {inventory.length === 0 && (
                    <p style={{
                      fontSize: "1rem",
                      fontWeight: "lighter",
                      color: "#ccc",
                      textAlign: "center",
                      marginBottom: "20px",
                      lineHeight: "1.4",
                      fontFamily: "Arial, sans-serif",
                      maxWidth: "100%",
                      gridColumn: "1 / -1" // Розтягнути текст на всю ширину сітки
                    }}>
                      Інвентар порожній — купіть предмети в магазині!
                    </p>
                  )}

                  {/* Відображення неекипірованих предметів за допомогою нового компонента */}
                  {unequippedItems.map((item, index) => (
                    <InventoryItemSlot
                      key={item.id || index}
                      item={item}
                      index={index}
                      fallbackIcon=""
                      onClick={() => {
                        if (item) setSelectedItem({ ...item, mode: "inventory" });
                      }}
                      onEquipToggle={() => toggleEquip(index)}
                    />
                  ))}
                </div>
              </div>
          </Placeholder>
        </Page>
      );
    case "adventures":
      return (
        <div>
          <Placeholder className="HIJtihMA8FHczS02iWF5"
          style={{ overflow: "visible" }}
          onClick={handleClick}>
            
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "50px",
                width: "100%",
                height: "100px",
                paddingBottom: 40,
                paddingTop: 40,
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
               <div>
                  <p 
                    style={{  
                      fontSize: "0.8rem",
                      fontWeight: "lighter",
                      fontFamily: "Arial, sans-serif",
                      fontVariantEmoji: "emoji",
                      color: "#ddd",
                      position: "absolute",
                      top: "-5px",
                      right: "10px",
                      background: "rgba(0, 0, 0, 0.35)",
                      borderRadius: "50px",
                      padding: "5px",
                      width: "10px",
                      height: "10px",
                    }}>
                    ?
                  </p>
                </div>
              <div
                className="imgWrap"
                style={{
                  position: "relative",
                  flexDirection: "column",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginTop: "0px",
                  width: "80%",
                  height: "80%",
                }}
              >
                <Image
                  className="blue"
                  alt="Artilith Logo Blue"
                  src={victim}
                  width= {65}
                  height={65}
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "200px",
                  }}
                />
                <p
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "lighter",
                  color: "#ccc",
                  textAlign: "center",
                  fontFamily: "Arial, sans-serif",
                  marginTop: "200px",
                }}
              >
              </p>
              </div>
              <div>
                  <span style={{
                  position: "relative",
                  flexDirection: "row",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginBottom: "20px",
                  width: "155px",
                  height: "100%",
                }} >
                 1🪨  1🔷  1⚡
                </span> 
                <Link href="" style={{
                  fontSize: "0.9rem",
                  fontWeight: "lighter",
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: "1",
                  fontFamily: "Arial, sans-serif",
                  marginLeft: "auto",
                }}>
                  <Button
                    style={{animation: "fadeIn 0.5s ease forwards", backgroundColor: "#4caf50", width:"100%" }}
                  >
                    {countdown > 0 ? `${formatTime(countdown)}` : "Отримати дари!"}
                  </Button>
              </Link>
              </div>
            </div>
          </Placeholder>
          <Placeholder>
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "0px",
                width: "100%",
                height: "100px",
                paddingBottom: 40,
                paddingTop: 40,
                animation: "fadeIn 0.5s ease forwards",
              }}
            >
              <div>
                <p 
                  style={{  
                    fontSize: "0.8rem",
                    fontWeight: "lighter",
                    fontFamily: "Arial, sans-serif",
                    fontVariantEmoji: "emoji",
                    color: "#ddd",
                    position: "absolute",
                    top: "-5px",
                    right: "10px",
                    background: "rgba(0, 0, 0, 0.35)",
                    borderRadius: "50px",
                    padding: "5px",
                    width: "10px",
                    height: "10px",
                  }}>
                  ?
                </p>
              </div>
              <div
                className="imgWrap"
                style={{
                  position: "relative",
                  flexDirection: "column",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginTop: "0px",
                  width: "80%",
                  height: "80%",
                }}
              >
                <Image
                  className="blue"
                  alt="Artilith Logo Blue"
                  src={travel}
                  width= {65}
                  height={65}
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "200px",
                  }}
                />
              </div>
              <div>
                  <span style={{
                  position: "relative",
                  flexDirection: "row",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                  marginBottom: "20px",
                  width: "100%",
                  height: "100%",
                }} >
                 +🪨 +🔷 -1⚡
                </span>
                  <Button style={{
                  fontSize: "0.9rem",
                  fontWeight: "lighter",
                  color: "#fff",
                  backgroundColor: "#4caf50",
                  textAlign: "center",
                  lineHeight: "1",
                  fontFamily: "Arial, sans-serif",
                  marginLeft: "auto",
                  animation: "fadeIn 0.5s ease forwards",
                }} onClick={() => router.push("/home/battle")}
                  >
                    ⚔️ Почати бій ⚔️
                  </Button>
              </div>
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
        <TopBar points={points} energy={energy} setEnergy={setEnergy} />
        <div style={{ paddingBottom: 100 }}>{renderContent()}</div>
        {selectedItem && (
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
              
              {selectedItem.mode === "city" && (
                <div
                  className={`item-image rarity-border-${selectedItem.rarity?.toLowerCase()} rarity-shadow-${selectedItem.rarity?.toLowerCase()}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: "#1e1e1e",
                    padding: "20px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "90%",
                    textAlign: "center",
                  }}
                >
                  <h2 className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{selectedItem.name}</h2>
                 {selectedItem.image && (
                      <img 
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "130px", height: "80px", objectFit: "contain", marginBottom: "30px", marginTop: "30px", boxShadow: "0 0 40 rgba(253, 253, 253, 0.5)", borderRadius: "50px", }}
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
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "50px" }}>
                    Міцність: 10 / 10
                  </p>
                <div onClick={(e) => e.stopPropagation()}>
                  <p>Придбати за <strong>{selectedItem.price}</strong> уламків?</p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "50px" }}>
                    <button onClick={() => {confirmBuy();setSelectedItem(null);}}
                      style={{
                        backgroundColor:"#4caf50",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        padding: "10px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                        width: "100%",
                        marginTop: "10px",
                      }}>
                        Так</button>
                    <button onClick={() => setSelectedItem(null)}
                      style={{
                        backgroundColor:"#f44336",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        padding: "10px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                        width: "100%",
                        marginTop: "10px",
                      }}>
                        Ні</button>
                  </div>
                </div>
                </div>
              )}

              {selectedItem.mode === "inventory" && (
                <div
                  className={`item-image rarity-border-${selectedItem.rarity?.toLowerCase()} rarity-shadow-${selectedItem.rarity?.toLowerCase()}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: "#1e1e1e",
                    padding: "20px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "90%",
                    textAlign: "center",
                  }}
                >
                  <h2 className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{selectedItem.name}</h2>
                  {selectedItem.image && (
                      <img 
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "130px", height: "80px", objectFit: "contain", marginBottom: "30px", marginTop: "30px", boxShadow: "0 0 40 rgba(253, 253, 253, 0.5)", borderRadius: "50px", }}
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
                  <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "50px" }}>
                    <button onClick={() => {handleDismantle(selectedItem);setSelectedItem(null);}}
                      style={{
                        backgroundColor: "#444",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "6px",
                        color: "#fff",
                        marginTop: "10px",
                        cursor: "pointer",
                      }}>
                        💥 Розібрати 
                    </button>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "0.8rem",
                        color: "#ddd",
                        top: "20px",
                        right: "20px",
                        background: "rgba(0, 0, 0, 0.59)",
                        border:"1px solid rgb(99, 99, 99)",
                        animation: "fadeIn 1s ease forwards",
                        borderRadius: "50px",
                        padding: "10px",
                        paddingInline: "10px",
                        paddingTop: "16px",
                        marginBottom: "0px",
                      }}>
                      x
                    </p>
                    <button onClick={() => {handleEquip(selectedItem);setSelectedItem(null);}}
                      style={{
                        backgroundColor: "#444",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "6px",
                        color: "#fff",
                        marginTop: "10px",
                        cursor: "pointer",
                      }}>
                        🫴 Екіпірувати 
                    </button>
                  </div>
                </div>
              )}

              {selectedItem.mode === "equipped" && (
                <div
                  className={`item-image rarity-border-${selectedItem.rarity?.toLowerCase()} rarity-shadow-${selectedItem.rarity?.toLowerCase()}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: "#1e1e1e",
                    padding: "20px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "90%",
                    textAlign: "center",
                  }}
                >
                  <h2 className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{selectedItem.name}</h2>
                  {selectedItem.image && (
                      <img 
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "130px", height: "80px", objectFit: "contain", marginBottom: "30px", marginTop: "30px", boxShadow: "0 0 40 rgba(253, 253, 253, 0.5)", borderRadius: "50px", }}
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
                          🫳 Зняти </button>

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
