"use client";

import React, { useEffect, useState, useRef } from "react";
import { List, Placeholder } from "@telegram-apps/telegram-ui";
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import artilithLogo from "../_assets/Artilith_logo-no-bg.png";
import sword01a from "../_assets/item/sword01a.png";
import shield01a from "../_assets/item/shield01a.png";
import potion01f from "../_assets/item/potion01f.png";
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import type { StaticImageData } from "next/image";


export default function HomePage() {
  // Кількість уламків (points)
  const [points, setPoints] = useState(0);
  const [clickDelay, setClickDelay] = useState(1000);
  const [isClickable, setIsClickable] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [animationTime, setAnimationTime] = useState(1100);
  const [activeTab, setActiveTab] = useState("home");


  // Перемикач, який показує заблокований контент (наприклад, рівень 2)
  const [locked, setLocked] = useState(true);

  // Модальне вікно для підтвердження покупки
  const [selectedItem, setSelectedItem] = useState<SelectedItemType>(null);
  type SelectedItemType = {
    item_id: number;
    name: string;
    image: string;
    description: string;
    damage?: string;
    strength?: string;
    price: number;
  } | null;

  type Item = {
    name: string;
    equipped: boolean;
    image: string | StaticImageData;
  };

  // Початковий інвентар
  const initialInventory: (Item | null)[] = [
    { name: "Дерев'яний меч", equipped: false, image: sword01a },
    { name: "Щит", equipped: false, image: shield01a },
    null,
  ];

  const [inventory, setInventory] = useState<(Item | null)[]>(initialInventory);
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
  async function updateUserPoints(userId: string | undefined, newPoints: number) {
  if (!userId) {
    console.error('userId не вказаний при оновленні балів');
    return false;
  }

  const { error } = await supabase
    .from('users')
    .update({ points: newPoints })
    .eq('id', userId);

  if (error) {
    console.error('Помилка оновлення балів:', error);
    return false;
  }
  return true;
  }

  // Додаємо предмет у інвентар користувача
  const addInventoryItem = async (userId: string, itemId: number, itemName: string) => {
  try {
  const { error: insertError } = await supabase
  .from('inventory')
  .insert([
    {
      user_id: userId,
      item_id: itemId,
      item: itemName,
    },
  ]);

  if (insertError) {
  console.error('Помилка вставки в інвентар:', insertError.message);
  return false;
  }

  return true;
  } catch (error) {
  console.error('Невідома помилка:', error);
  return false;
  }
  };

  // натискаємо "купити"
  interface ItemType {
    item_id: number;
    name: string;
    image: string;
    description: string;
    damage?: string;
    strength?: string;
    price: number;
  }

  // підтвердження покупки
  const confirmBuy = async () => {
    if (selectedItem) {
      await handleBuyItem(selectedItem);
      setSelectedItem(null);
    }
  };


  // Функція обробки покупки
  const handleBuyItem = async (item: { item_id: number; name: string; image: string; description: string; damage?: string; strength?: string; price: number }) => {
    if (points < item.price) {
      toast.error("Недостатньо уламків для покупки!");
      return;
    }

    if (!userId) {
      toast.error('Користувач не знайдений!');
      return;
    }

  // Перевірити чи предмет вже є
  // const exists = await checkInventoryItem(String(userId), item.item_id);
  // if (exists) {
  //   toast.error(`Ви вже маєте ${item.name}!`);
  //   return;
  // }

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

  // Перевірка наявності предмета в інвентарі
  const checkInventoryItem = async (userId: string, itemId: number) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single(); // або .maybeSingle()

    return !!data; // якщо знайдено — true
  }

  async function getUserInventory(userId: string) {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, item_id, items ( name, image, description, damage, defense, price )')
      .eq('user_id', userId);

    if (error) {
      console.error('Помилка завантаження інвентаря:', error);
      return [];
    }

    return data;
  }
  
  // Збереження даних користувача
  const saveUserData = async (newPoints: number, newClickDelay: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from("users")
      .upsert([{ id: userId, points: newPoints, click_delay: newClickDelay }], {
        onConflict: "id",
      });

    if (error) console.error("Помилка збереження:", error);
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

  const toggleEquip = (index: number) => {
    setInventory((prev) =>
      prev.map((item, i) =>
        i === index && item ? { ...item, equipped: !item.equipped } : item
      )
    );
  };


  // Компонент ItemCard
  type ItemCardProps = ItemType & {
  onBuyRequest: (item: ItemType) => void;
  };
  const ItemCard: React.FC<ItemCardProps> = ({ item_id, name, image, description, damage, strength, price,onBuyRequest }) => (
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
      width={50} 
      height={50}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(253, 253, 253, 0.37)",
        padding: "20px",
        borderRadius: "10px",
        marginBottom: "15px",
        boxShadow: " rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
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
        onClick={() => onBuyRequest({ item_id, name, image, description, damage, strength, price })}
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

  const imageMap: Record<number, string> = {
    1: sword01a.src,
    2: shield01a.src,
    3: potion01f.src,
  };
  
  

  // Функція додавання предмета в інвентар
  useEffect(() => {
    const fetchInventory = async () => {
      if (!userId) return;
  
      const { data, error } = await supabase
        .from('inventory')
        .select('id, item_id, item ( name, description, damage, defense, price )')
        .eq('user_id', userId);
  
      if (error) {
        console.error('Помилка при завантаженні інвентаря:', error.message);
        return;
      }
      
      if (data) {
        const formatted = data.map((entry) => {
          const item = Array.isArray(entry.item) ? entry.item[0] : entry.item;
          const itemId = Number(entry.item_id);
          const image = imageMap[itemId];
  
          if (!image) {
            console.warn(`Зображення не знайдено для item_id: ${itemId}`);
          }
  
          return {
            name: item?.name,
            description: item?.description,
            damage: item?.damage,
            strength: item?.defense,
            price: item?.price,
            image,
            equipped: false,
          };
        });        
  
        setInventory(formatted);
      }
    };
  
    fetchInventory();
  }, [userId]);
  


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
                  item_id={1}
                  name="Навчальний меч"
                  image={sword01a.src}
                  description="Простий меч для початківців."
                  damage="Шкода: 1"
                  strength="Міцність: 5"
                  price={30}
                  onBuyRequest={(item) => setSelectedItem(item)}
                />

                <ItemCard
                  item_id={2}
                  name="Навчальний щит"
                  image={shield01a.src}
                  description="Простий щит для початківців."
                  damage=""
                  strength="Міцність: 15"
                  price={65}
                  onBuyRequest={(item) => setSelectedItem(item)}
                />

                <ItemCard
                  item_id={3}
                  name="Маленьке зілля енергії"
                  image={potion01f.src}
                  description="Відновлює енергію. Один ковток — і ви знову в строю."
                  price={50}
                  onBuyRequest={(item) => setSelectedItem(item)}
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
                    item_id={0}
                    name="Хитрун"
                    image={sword01a.src}
                    description="Хитрун"
                    damage="Шкода: Хитрун"
                    strength="Міцність: Хитрун"
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
              width: "100%", // Повна ширина для контейнера
              boxSizing: "border-box", // Коригує обчислення ширини елементів
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "10px", textAlign: "center", color: "#fff", lineHeight: "1" }}>ГЕРОЙ</h1>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "lighter", color: "#ccc", textAlign: "center", marginBottom: "20px", lineHeight: "1.4", fontFamily: "Arial, sans-serif", maxWidth: "90%" }}>
              Тут ви можете налаштувати свого героя, прокачати його та підготувати до пригод.
            </h2>
      
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "15px", padding: "20px", width: "100%", maxWidth: "400px", boxShadow: "0 0 10px rgba(0,0,0,0.3)", position: "relative", overflow: "hidden", marginBottom: "40px" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "60px", color: "#fff" }}>🛡️</span>
              </div>
      
              <div style={{ width: "100%", color: "#fff", fontSize: "1rem", textAlign: "left" }}>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Рівень:</strong> 0
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Здоровя:</strong>
                  <div style={{ width: "100%", height: "12px", backgroundColor: "#444", borderRadius: "6px", overflow: "hidden", marginTop: "5px" }}>
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(to right, #4caf50, #8bc34a)", transition: "width 0.5s ease" }} />
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
      
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", marginTop: "30px", marginBottom: "30px", textAlign: "center", color: "#fff" }}>
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
                  gridTemplateColumns: "repeat(2, 1fr)", // 3 колонки за замовчуванням
                  gap: "20px",
                  width: "100%",
                  maxWidth: "100%",
                  margin: "0 auto",
                }}
              >
                {/* Медіа-запити для адаптації на мобільних пристроях */}
                <style>{`
                  @media (max-width: 1024px) {
                    div[style*="gridTemplateColumns"] {
                      grid-template-columns: repeat(2, 1fr); /* 2 колонки на екранах шириною до 1024px */
                    }
                  }
                  @media (max-width: 480px) {
                    div[style*="gridTemplateColumns"] {
                      grid-template-columns: 1fr; /* 1 колонка на екранах шириною до 480px */
                    }
                  }
                `}</style>
                {inventory.length > 0 &&
                  inventory.map((item, index) => (
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
                  <div style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    backgroundColor: item ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    color: item ? "#fff" : "#777",
                    marginBottom: "10px",
                    overflow: "hidden",
                  }}>
                    {item?.image ? (
                      <img
                        src={typeof item.image === "string" ? item.image : item.image.src}
                        alt={item.name}
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(253, 253, 253, 0.37)",
                          padding: "20px",
                          borderRadius: "10px",
                          boxShadow: " rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
                          maxWidth: "100%",
                          height: "auto", // Забезпечуємо адаптацію зображень
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
                        maxWidth: "150px", // Обмежуємо максимальну ширину кнопок
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
