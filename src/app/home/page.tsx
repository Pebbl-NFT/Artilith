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
import Shop from "@/components/Shop";

// Дані та логіка
import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";
import { WeaponItems as RawWeaponItems } from "@/components/Item/WeaponItem";
import { ShieldItems as RawShieldItems } from "@/components/Item/ShieldItem";
import { ScrollItems as RawScrollItems } from "@/components/Item/ScrollItem";

// Convert item_id to string to match Item type
const WeaponItems = RawWeaponItems.map(item => ({ ...item, item_id: String(item.item_id) }));
const ShieldItems = RawShieldItems.map(item => ({ ...item, item_id: String(item.item_id) }));
const ScrollItems = RawScrollItems.map(item => ({ ...item, item_id: String(item.item_id) }));
import { formatTime } from "@/utils/formatTime";
import { getPlayerStats } from "@/utils/getPlayerStats";
import { updateUserPoints } from "@/hooks/useUserPoints";
import {addInventoryItem} from "@/hooks/useItemActions";

// Зображення
import victim from "../_assets/victim.png";
import travel from "../_assets/travel.png";
import citybg from '../_assets/citybg.jpg';
import shopbg from '../_assets/shopbg.jpg';
import blacksmithbg from '../_assets/blacksmithbg.jpg';
import alleyofheroesnbg from '../_assets/alleyofheroesnbg.jpg';
import CardbgCommon from '@/assets/CardbgCommon_fixed.png'


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
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedItemToUpgrade, setSelectedItemToUpgrade] = useState<InventoryItemType | null>(null); // Замість selectedWeapon

  type InventoryItemType = {
    id: string;
    item_id: number;
    type: string;
    name: string;
    image: string;
    description: string;
    damage?: number;
    defense?: number;
    strength?: number;
    price: number;
    rarity?: string;
    equipped?: boolean;
    upgrade_level?: number;
  };

  const [selectedWeapon, setSelectedWeapon] = useState<InventoryItemType | null>(null);
  // Define a minimal Item type for scrolls, or adjust as needed
  type ScrollItemType = {
    id: string;
    item_id: number;
    type: string;
    name: string;
    image: string;
    description: string;
    price: number;
    rarity?: string;
    equipped?: boolean;
    upgrade_level?: number;
  };
  const [selectedScroll, setSelectedScroll] = useState<ScrollItemType | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [result, setResult] = useState<{ type: string; text: string } | null>(null);

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
    mode: "city" | "inventory" | "equipped" | "sweapon" |"sshield" |"sscroll";
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
    upgrade_level?: number;
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
    const newPoints = points + 2;
    const newEnergy = (energy ?? 0) + 2; // Додаємо +1 до енергії, якщо energy null, беремо 0
    const newClickDelay = clickDelay + 5000;
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
    const xpGain = 5; // Кожен клік — +1 XP
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
      toast.success(`Вам зараховано + 2 🪨`);
      toast.success(`Вам зараховано + 2 ⚡`);
      toast.success(`Вам зараховано + 5 🔷`);
  };

 function getEnchantChance(upgradeLevel: number): number {
  if (upgradeLevel < 1) return 1.0; // 100%
  if (upgradeLevel === 1) return 0.9; // 90%
  if (upgradeLevel === 2) return 0.8; // 80% (виправлено з 0.9 на 0.8 згідно коментаря, якщо це малося на увазі)
  if (upgradeLevel >= 3 && upgradeLevel < 4) return 0.6; // 60%
  if (upgradeLevel >= 4 && upgradeLevel < 5) return 0.5; // 50%
  if (upgradeLevel >= 5 && upgradeLevel < 6) return 0.4; // 40%
  if (upgradeLevel >= 6 && upgradeLevel < 7) return 0.3; // 30%
  if (upgradeLevel >= 7 && upgradeLevel < 8) return 0.2; // 20%
  if (upgradeLevel >= 8 && upgradeLevel < 9) return 0.091; // 9.1%
  if (upgradeLevel >= 9 && upgradeLevel < 10) return 0.0585; // 5.85%
  if (upgradeLevel >= 10 && upgradeLevel < 11) return 0.04; // 4%
  if (upgradeLevel >= 11 && upgradeLevel < 12) return 0.027; // 2.7%
  if (upgradeLevel >= 12 && upgradeLevel < 13) return 0.0173; // 1.73%
  if (upgradeLevel >= 13 && upgradeLevel < 14) return 0.0116; // 1.16%
  // У твоєму оригінальному коді було дві однакові умови для 13-14, я вибрав останню
  if (upgradeLevel >= 14 && upgradeLevel < 15) return 0.0077; // 0.77%
  return 0; // не можна більше покращувати або шанс вкрай низький
}

const RARE_SCROLL_ITEM_ID = 1001; // ID рідкісного сувою, який захищає від поломки

// Основна функція спроби покращення предмета
async function tryUpgradeWeapon(
  inventoryId: string, // ID запису предмета в таблиці 'inventory' Supabase
  upgradeLevel: number,
  scrollId: string, // ID запису сувою в таблиці 'inventory' Supabase
  useProtectionItem: boolean // Чи використовується універсальний захисний предмет
): Promise<{ result: "success" | "fail" | "broken" | "safe_fail" | "protected_fail" | "error"; newLevel?: number | null }> {
  // 1. Отримуємо інформацію про використаний сувій з інвентарю
  const { data: scrollData, error: scrollFetchError } = await supabase
    .from("inventory")
    .select("item_id")
    .eq("id", scrollId)
    .single();

  if (scrollFetchError || !scrollData) {
    console.error("Помилка при отриманні інформації про сувій або сувій не знайдено:", scrollFetchError?.message);
    return { result: "error", newLevel: upgradeLevel };
  }

  // 2. Визначаємо, чи використано Рідкісний сувій
  const isRareScrollUsed = scrollData.item_id === RARE_SCROLL_ITEM_ID;

  const currentChance = getEnchantChance(upgradeLevel);
  const isSuccess = Math.random() < currentChance;

  // 3. Видаляємо використаний сувій з інвентарю (незалежно від результату покращення)
  const { error: deleteScrollError } = await supabase.from("inventory").delete().eq("id", scrollId);

  if (deleteScrollError) {
    console.error("Помилка при видаленні сувою:", deleteScrollError.message);
    // Це може бути критична помилка, залежно від вашої логіки.
    // Наразі, ми продовжуємо, але логуємо проблему.
  }

  if (isSuccess) {
    // Успішне покращення
    await supabase
      .from("inventory")
      .update({ upgrade_level: upgradeLevel + 1 })
      .eq("id", inventoryId);
    return { result: "success", newLevel: upgradeLevel + 1 };
  } else {
    // Покращення не вдалося
    if (isRareScrollUsed) {
      // Якщо використано Рідкісний сувій, предмет ніколи не ламається
      return { result: "safe_fail", newLevel: upgradeLevel };
    }

    // Існуюча логіка безпечної невдачі для низьких рівнів (якщо предмет не "захищений" Рідкісним сувоєм)
    const isSafeUpgradeBasedOnLevel = upgradeLevel < 4; // Перейменовано для уникнення конфлікту
    if (isSafeUpgradeBasedOnLevel) {
      return { result: "safe_fail", newLevel: upgradeLevel };
    }

    // Існуюча логіка захисту за допомогою окремого захисного предмета (якщо предмет не "захищений" Рідкісним сувоєм)
    if (useProtectionItem) {
      return { result: "protected_fail", newLevel: upgradeLevel };
    }

    // Якщо нічого не врятувало, предмет ламається — видаляємо сам предмет
    await supabase.from("inventory").delete().eq("id", inventoryId);
    return { result: "broken", newLevel: null };
  }
}

// --- Інтерфейси та допоміжні функції (без змін, залишаємо як є) ---

interface UpgradableItem {
  damage: number;
  defense: number;
}

interface UpgradedStats {
  damage: number;
  defense: number;
}

const getUpgradedStats = (base: UpgradableItem, level: number): UpgradedStats => {
  // Наприклад: +1 damage і +10% defense за кожен рівень
  return {
    damage: base.damage + level,
    defense: Math.round(base.defense * (1 + 0.1 * level)),
  };
};

  // Функція додавання предмета в інвентар
  const fetchInventory = async () => {
    if (!userId) return [];
    setLoading(true);

    const { data, error } = await supabase
      .from("inventory")
      .select(`
        id,
        item_id,
        equipped,
        upgrade_level
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Помилка при завантаженні інвентаря:", error.message);
      setLoading(false);
      return [];
    }

    if (data) {
      const formatted = data.map((entry) => {
        const item = AllItems.find((i) => i.item_id === entry.item_id);
        return {
          ...item,
          id: entry.id,
          equipped: entry.equipped ?? false,
          upgrade_level: entry.upgrade_level ?? 0,
        };
      });      

      setInventory(formatted);
      setLoading(false);
      return formatted;
    }

    setLoading(false);
    return [];
  };

  // Функція для стекування однакових предметів
  interface StackableInventoryItem extends InventoryItemType {
    count: number;
  }

  const stackItems = (inventory: InventoryItemType[]): StackableInventoryItem[] => {
    const itemStacks: Record<string, StackableInventoryItem> = {};
    inventory.forEach((item: InventoryItemType) => {
      const key = `${item.type}-${item.name}-${item.rarity}-${item.upgrade_level}`;
      if (!itemStacks[key]) {
        itemStacks[key] = { ...item, count: 1 }; // Додаємо поле `count`
      } else {
        itemStacks[key].count += 1; // Збільшуємо кількість у стеку
      }
    });
    return Object.values(itemStacks); // Повертаємо масив об'єктів
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
        .eq('id', selectedItem.id); // Зміна тут
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
        .eq('id', selectedItem.id); // Зміна тут
    }

    await fetchInventory(); // Оновити інвентар
    await updateHeroStats(); // Оновити характеристики героя
  };

  // Завантажуємо інвентар при зміні userId
  useEffect(() => {
    if (activeTab === "home" && userId) {
      fetchInventory();
    }
    if (activeTab === "blacksmith" && userId) {
      fetchInventory();
    }
  }, [activeTab, userId]);

  const [players, setPlayers] = useState<{ id: any; first_name: any; level: any }[]>([]);
      // Функція обрахунку характеристик героя
  const updateHeroStats = useCallback(() => {
    const stats = getPlayerStats(inventory);
    setHeroStats(stats);
  }, [inventory]);

  // Виклик функції при зміні інвентарю
  useEffect(() => {
    updateHeroStats();
  }, [inventory, updateHeroStats]);


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

  useEffect(() => {
    const updateSelectedWeapon = async () => {
      await fetchInventory();
      const updated = inventory.find(i => i.id === selectedWeapon?.id);
      setSelectedWeapon(updated ?? null);
    };
    if (selectedWeapon) {
      updateSelectedWeapon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeapon?.id]);

  useEffect(() => {
    if (selectedWeapon && !inventory.find(i => i.id === selectedWeapon.id)) {
      setSelectedWeapon(null);
    }
  }, [inventory]);

  useEffect(() => {
    if (!selectedWeapon) return;
    const updated = inventory.find(i => i.id === selectedWeapon.id);
    if (updated && updated !== selectedWeapon) {
      setSelectedWeapon(updated);
    }
  }, [inventory]);

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
          </Placeholder>
          <Placeholder style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 1s ease forwards",
            marginTop: "-40px",
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
          <Shop
    WeaponItems={WeaponItems}
    ShieldItems={ShieldItems}
    ScrollItems={ScrollItems}
    setSelectedItem={(item) =>
      setSelectedItem({
        ...item,
        mode: "city",
        item_id: Number(item.item_id),
        damage: item.damage !== undefined ? String(item.damage) : undefined,
        defense: item.defense !== undefined ? String(item.defense) : undefined,
      })
    }
/>
        </Page>
      );
      return (
        <Page back>
          <Placeholder>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "50px",
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
                  marginLeft: "240px",
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

              <Card className="page" onClick={() => setActiveTab("upgrade")} 
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
      case "blacksmith":
        const upgradableItemsFromInventory = inventory.filter(
          (i) => i.type === "weapon" || i.type === "shield"
        );
        const scrollItemsFromInventory = inventory.filter(i => i.type === "scroll");
        return (
          <Page back>
            <Placeholder>
              <div
                className="page"
                style={{
                  backgroundImage: `url(${blacksmithbg.src})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "top",
                  justifyContent: "top",
                  animation: "fadeIn 1s ease forwards",
                  backgroundSize: 'cover', // Покрити весь блок
                  backgroundPosition: 'top', // Центрувати зображення
                  height: '200px', // Зайняти всю висоту вікна
                  color: "#fff", // Текст навколо, щоб бути білішим на фоні
                  marginTop: "20px", // Збільшено відступ зверху
                }}
              >
                <h1
                style={{
                  fontSize: "1.6rem", // Збільшено для акценту
                  fontWeight: "bold",
                  marginBottom: "110px",
                  textAlign: "center",
                  paddingTop: "20px", // Збільшено відступ зверху
                  paddingLeft: "55%", // Збільшено відступ зліва
                  color: "#fff",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.7)", // Додано тінь для тексту
                  animation: "fadeIn 1s ease forwards", // Додано анімацію
                }}
                >
                  КОВАЛЬ
                </h1>
                <p
                  style={{
                    fontSize: "0.7rem", // Трохи збільшено
                    color: "#e0e0e0", // Світліший сірий
                    textAlign: "center",
                    marginBottom: "30px",
                    maxWidth: "600px",
                    background: "rgba(0, 0, 0, 0.65)", // Трохи темніший фон для кращої читабельності
                    padding: "10px 15px", // Збільшено падінги
                    animation: "fadeIn 1.5s ease forwards 0.5s", // Додано затримку анімації
                    borderRadius: "8px", // Закруглені кути
                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)", // Додано тінь
                  }}
                >
                  Тут кується доля... або просто ламається черговий меч. Обирай мудро!
                </p>
              </div>
              <div
                style={{ // Переконайтесь, що blacksmithbg.src правильно імпортовано
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  animation: "fadeIn 1s ease forwards",
                  padding: "0px",
                }}
              >
                {/* <Card className="page" style={{ ... }}>ВІДРЕМОНТУВАТИ</Card> */}
                <Card // Основна картка для процесу покращення
                  className="page" // Ви можете використовувати цей клас для загальних стилів карток
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: "20px", // Збільшено відступ між секціями
                    padding: "25px", // Збільшено падінги
                    color: "#fff",
                    background: "rgba(10, 20, 30, 0.75)", // Темніший, більш "металевий" фон
                    borderRadius: "12px", // Більш заокруглені кути
                    width: "100%",
                    maxWidth: "700px", // Обмеження максимальної ширини
                    boxShadow: "0 8px 16px rgba(0,0,0,0.4)", // Більш виражена тінь
                  }}
                >
                  <div style={{ fontSize: "1.6rem", marginBottom: "10px", marginTop: "10px", fontWeight: "bold", color: "#FFD700" }}>
                    ПОКРАЩЕННЯ СПОРЯДЖЕННЯ
                  </div>
                  {/* Секція вибору Предмета (Зброя або Щит) */}
                  <div style={{ width: '100%' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '15px', fontSize: '1.3rem', color: '#C0C0C0' }}>
                      1. Виберіть Предмет для Покращення:
                    </h3>
                    {upgradableItemsFromInventory.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", justifyContent: "center", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                        {upgradableItemsFromInventory.map(item => {
                          const stats = getUpgradedStats(item, item.upgrade_level ?? 0); // Передаємо 0, якщо upgrade_level undefined
                          return (
                            <Card
                              key={item.id}
                              style={{
                                padding: "12px",
                                minWidth: "160px",
                                maxWidth: "180px",
                                background: selectedItemToUpgrade?.id === item.id ? "rgba(70, 80, 50, 0.9)" : "rgba(40, 43, 21, 0.8)",
                                border: selectedItemToUpgrade?.id === item.id ? "2px solid #AFFFAB" : "1.5px solid #778",
                                cursor: "pointer",
                                borderRadius: "8px",
                                textAlign: "center",
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                boxShadow: selectedItemToUpgrade?.id === item.id ? "0 0 15px #AFFFAB" : "none",
                              }}
                              onClick={() => setSelectedItemToUpgrade(item)}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                            >
                              <Image src={item.image} width={48} height={48} alt={item.name} style={{ marginBottom: '8px' }} />
                              <div style={{ fontWeight: 'bold', color: selectedItemToUpgrade?.id === item.id ? '#FFF' : '#DDD' }}>{item.name} <span style={{ color: '#AFFFAB', fontSize: 15 }}>+{item.upgrade_level ?? 0}</span></div>
                              <div style={{ fontSize: 12, color: '#A0A0FF' }}>
                                {/* Умовне відображення характеристик */}
                                {item.type === "weapon" && `Шкода: ${stats.damage}`}
                                {item.type === "shield" && `Захист: ${stats.defense}`}
                                {/* Якщо предмет може мати і те, і інше, можна розширити логіку */}
                                {item.type !== "weapon" && item.type !== "shield" && `Тип: ${item.type}`}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: "#ccc", textAlign: "center", padding: "10px" }}>У вас немає зброї чи щитів для покращення.</div>
                    )}
                  </div>
                  {/* Секція вибору Сувою (з'являється після вибору предмета) */}
                  {selectedItemToUpgrade && (
                    <div style={{ width: '100%', marginTop: '20px' }}>
                      <h3 style={{ textAlign: 'center', marginBottom: '15px', fontSize: '1.3rem', color: '#C0C0C0' }}>
                        2. Виберіть Сувій Покращення:
                      </h3>
                      {scrollItemsFromInventory.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                          {scrollItemsFromInventory.map(scroll => (
                            <Card
                              key={scroll.id}
                              onClick={() => setSelectedScroll(scroll)}
                              style={{
                                padding: "10px",
                                minWidth: "130px",
                                background: selectedScroll?.id === scroll.id ? "rgba(70, 80, 50, 0.9)" : "rgba(40, 43, 21, 0.8)",
                                border: selectedScroll?.id === scroll.id ? "2px solid #AFFFAB" : "1px solid #666",
                                cursor: "pointer",
                                borderRadius: "8px",
                                textAlign: "center",
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                boxShadow: selectedScroll?.id === scroll.id ? "0 0 15px #AFFFAB" : "none",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                            >
                              <Image src={scroll.image} width={40} height={40} alt={scroll.name} style={{ marginBottom: '5px', borderRadius:'50%',  boxShadow: '0 0 8px rgba(255,255,255,0.3)' }} />
                              <div style={{ fontSize: 13, color: selectedScroll?.id === scroll.id ? '#FFF' : '#DDD' }}>{scroll.name}</div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "#ccc", textAlign: "center", padding: "10px" }}>Немає сувоїв для покращення.</div>
                      )}
                    </div>
                  )}
                  {/* Зона дії: Кнопка та Шанс (з'являється після вибору предмета та сувою) */}
                  {selectedItemToUpgrade && selectedScroll && (
                    <div style={{ marginTop: "25px", marginBottom: "10px", textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.1rem', color: '#FFD700', marginBottom: '8px' }}>
                        Обрано: {selectedItemToUpgrade.name} +{selectedItemToUpgrade.upgrade_level ?? 0}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#B0E0E6', marginBottom: '15px' }}>
                        Сувій: {selectedScroll.name}
                      </div>
                      <div style={{ fontSize: '1.4rem', color: '#aaa', marginBottom: "15px", fontWeight: 'bold' }}>
                        Шанс успіху: {Math.round(getEnchantChance(selectedItemToUpgrade.upgrade_level ?? 0) * 100)}%
                      </div>
                      <Button
                        onClick={async () => {
                          if (!selectedItemToUpgrade || !selectedScroll) return;
                          setIsUpgrading(true);
                          setResult(null); // Скидаємо попередній результат
                          // Тут ваша вже існуюча функція tryUpgradeWeapon
                          const upgradeOutcome = await tryUpgradeWeapon(
                            selectedItemToUpgrade.id,
                            selectedItemToUpgrade.upgrade_level ?? 0,
                            selectedScroll.id,
                            false // useProtectionItem
                          );
                          // Формування тексту результату стало більш детальним
                          let resultText = "";
                          let resultType = upgradeOutcome.result; // success, safe_fail, protected_fail, broken
                          if (upgradeOutcome.result === 'success') {
                            resultText = `${selectedItemToUpgrade.name} успішно покращено до +${upgradeOutcome.newLevel}!`;
                          } else if (upgradeOutcome.result === 'broken') {
                            resultText = `О ні! ${selectedItemToUpgrade.name} зламався та зник...`;
                          } else if (upgradeOutcome.result === 'safe_fail') {
                            resultText = `Покращення ${selectedItemToUpgrade.name} не вдалося, але він залишився цілим.`;
                            resultType = 'fail'; // Для візуального стилю "невдачі"
                          } else if (upgradeOutcome.result === 'protected_fail') {
                            resultText = `Захист спрацював! ${selectedItemToUpgrade.name} не покращився, але й не зламався.`;
                            resultType = 'fail'; // Для візуального стилю "невдачі"
                          } else {
                            resultText = 'Сталася невідома помилка під час покращення.';
                            resultType = 'error'; // Загальний тип для помилок
                          }
                          setResult({ type: resultType, text: resultText });
                          setSelectedScroll(null); // Скидаємо сувій
                          setIsUpgrading(false);
                          await fetchInventory(); // Оновлюємо інвентар
                          // Оновлюємо вибраний предмет, якщо він не зламався
                          if (upgradeOutcome.result !== 'broken') {
                              const updatedItem = inventory.find(i => i.id === selectedItemToUpgrade.id);
                              setSelectedItemToUpgrade(updatedItem ?? null);
                          } else {
                              setSelectedItemToUpgrade(null); // Предмет зник
                          }
                        }}
                        disabled={!selectedItemToUpgrade || !selectedScroll || isUpgrading}
                        style={{ // Приклад стилів для кнопки
                          padding: '15px 30px',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          cursor: isUpgrading || !selectedItemToUpgrade || !selectedScroll ? 'not-allowed' : 'pointer',
                          borderRadius: '8px',
                          background: isUpgrading ? '#555' : 'linear-gradient(145deg, #ffac41, #ff8c00)',
                          color: isUpgrading? '#aaa' : '#fff',
                          border: 'none',
                          boxShadow: isUpgrading ? 'none' : '0 4px 8px rgba(0,0,0,0.3)',
                          transition: 'background 0.3s ease, transform 0.1s ease',
                        }}
                        onMouseDown={(e) => { if(!isUpgrading) e.currentTarget.style.transform = 'scale(0.98)'; }}
                        onMouseUp={(e) => { if(!isUpgrading) e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        {isUpgrading ? "КУВАННЯ..." : "⚡ ПОКРАЩИТИ ⚡"}
                      </Button>
                    </div>
                  )}
                  {/* Відображення результату */}
                  {result && (
                    <div style={{
                      color: result.type === 'success' ? "#86DC3D" : result.type === 'broken' ? "#FFA07A" : (result.type === 'fail' ? "#FFD700" : "#FF6347"),
                      marginTop: "20px",
                      padding: "15px",
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                      textAlign: 'center',
                      background: `rgba(${
                        result.type === 'success' ? '46, 204, 113' :
                        result.type === 'broken' ? '231, 76, 60' :
                        result.type === 'fail' ? '241, 196, 15' :
                        '200, 200, 200' // default для error
                      }, 0.15)`,
                      borderRadius: '8px',
                      border: `2px solid ${result.type === 'success' ? "#86DC3D" : result.type === 'broken' ? "#FFA07A" : (result.type === 'fail' ? "#FFD700" : "#FF6347")}`,
                      animation: `${result.type === 'success' ? 'successGlow' : (result.type === 'fail' || result.type === 'broken' ? 'failShake' : 'fadeIn')} 0.5s ease-in-out`
                    }}>
                      {result.text}
                    </div>
                  )}
                </Card>
              </div>
            </Placeholder>
          </Page>
        );
    case "guild":
      return (
        <Page back>
          <Placeholder>
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "50px",
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
            <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "50px",
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
                marginTop: "40px",
                animation: "fadeIn 0.6s ease forwards",
              }}
            >
              <h1 style={{ 
                fontSize: "2rem", 
                fontWeight: "bold", 
                marginBottom: "30px", 
                marginTop: "0px",
                textAlign: "center", 
                color: "#fff", 
                lineHeight: "1" }}>
                  ДІМ
              </h1>
              <div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "lighter",
                    fontFamily: "Arial, sans-serif",
                    fontVariantEmoji: "emoji",
                    color: "#ddd",
                    position: "absolute",
                    top: "-5px", // Позиціонуємо відносно батьківського div з relative
                    right: "15px", // Позиціонуємо відносно батьківського div з relative
                    background: "rgba(0, 0, 0, 0.35)",
                    borderRadius: "50px",
                    padding: "5px",
                    width: "10px",
                    height: "10px",
                    zIndex: 20, // Переконуємося, що "?" поверх тултіпа, якщо потрібно
                    cursor: "help", // Змінюємо курсор на знак питання для підказки
                  }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  ?
                </p>
                {showTooltip && ( // Відображаємо тултіп тільки якщо showTooltip === true
                <div
                  style={{
                    position: "absolute", // Абсолютне позиціонування відносно батьківського div з relative
                    top: "20px", // Відступ зверху від батьківського div (можливо, потрібно підлаштувати)
                    right: "30px", // Позиціонуємо праворуч від батьківського div (можливо, потрібно підлаштувати)
                    // Можна спробувати позиціонувати ліворуч, якщо праворуч заважає:
                    // left: "0px",
                    // top: "20px",
                    background: "rgba(0, 0, 0, 0.85)", // Темний напівпрозорий фон
                    color: "#fff", // Білий текст
                    padding: "8px 12px", // Внутрішні відступи
                    borderRadius: "8px", // Закруглені кути
                    whiteSpace: "normal", // Дозволяємо тексту переноситись на новий рядок
                    maxWidth: "300px", // Обмежуємо максимальну ширину тултіпа
                    zIndex: 15, // Переконуємося, що тултіп під "?" але поверх іншого вмісту
                    pointerEvents: "none", // Тултіп не перехоплює події миші
                    fontSize: "0.9rem", // Розмір шрифту
                    lineHeight: "1.3", // Міжрядковий інтервал
                    textAlign: "left", // Вирівнювання тексту
                    transform: 'translateX(5%)', // Невеличкий зсув праворуч від правої межі батьківського блоку
                    // Якщо позиціонували ліворуч: transform: 'translateX(-105%)', // Зсув ліворуч від лівої межі батьківського блоку
                  }}
                >
                  Тут ви можете налаштувати свого героя, та підготувати до пригод.
                </div>
              )}
              </div>

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

                    <Button onClick={() => setActiveTab("abilities")} style={{
                    border:"1px solid rgb(99, 99, 99)",
                    backgroundColor:"rgba(0, 0, 0, 0)",
                    borderRadius: 8,
                    }}>
                      <p style={{ fontSize: 12, }} >
                        Здібності
                      </p>
                      <span
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
                    <Link href="/home/profile">
                      <Button style={{
                        border:"1px solid rgb(99, 99, 99)",
                        backgroundColor:"rgba(0, 0, 0, 0)",
                        borderRadius: 8,
                        }}>
                        📜
                      </Button>
                    </Link>
                    <Button onClick={() => setActiveTab("task")} style={{
                    border:"1px solid rgb(99, 99, 99)",
                    backgroundColor:"rgba(0, 0, 0, 0)",
                    borderRadius: 8,
                    }}>
                      <p style={{ fontSize: 12, }} >
                        Завдання
                      </p>
                      <span
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
                </div>
              </Card>

                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: "bold",
                    marginTop: "50px",
                    marginBottom: "40px",
                    textAlign: "center",
                    color: "#fff",
                  }}
                >
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
                  {/* Повідомлення про порожній інвентар */}
                  {inventory.length === 0 && (
                    <p
                      style={{
                        fontSize: "1rem",
                        fontWeight: "lighter",
                        color: "#ccc",
                        textAlign: "center",
                        marginBottom: "20px",
                        lineHeight: "1.4",
                        fontFamily: "Arial, sans-serif",
                        maxWidth: "100%",
                        gridColumn: "1 / -1", // Розтягнути текст на всю ширину сітки
                      }}
                    >
                      Інвентар порожній — купіть предмети в магазині!
                    </p>
                  )}

                  {/* Групування однакових предметів у стеки */}
                  {stackItems(unequippedItems).map((item, index) => (
                    <InventoryItemSlot
                      key={`${item.type}-${index}`} // Ключ базується на типі та індексі
                      item={item}
                      index={index}
                      fallbackIcon=""
                      onClick={() => {
                        if (item) setSelectedItem({ 
                          ...item, 
                          mode: "inventory",
                          damage: item.damage !== undefined ? String(item.damage) : undefined,
                          defense: item.defense !== undefined ? String(item.defense) : undefined,
                          strength: item.strength !== undefined ? String(item.strength) : undefined,
                        });
                      }}
                      onEquipToggle={() => toggleEquip(index)}
                    />
                  ))}
                </div>
              </div>
          </Placeholder>
        </Page>
      );
      case "abilities":
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
                marginTop: "40px",
                animation: "fadeIn 0.6s ease forwards",
              }}
            >
              <h1 style={{ 
                fontSize: "1rem", 
                fontWeight: "bold", 
                marginBottom: "20px", 
                marginTop: "20px",
                textAlign: "center", 
                color: "#fff", 
                lineHeight: "1" }}>
                  ЗДІБНОСТІ
              </h1>
            </div>
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "10px",
                animation: "fadeIn 0.6s ease forwards",
              }}
            >
              <h1 style={{ 
                fontSize: "1rem", 
                fontWeight: "bold", 
                marginBottom: "50px", 
                marginTop: "50px",
                textAlign: "center", 
                color: "#fff", 
                lineHeight: "1" }}>
                  В розбробці
              </h1>
            </div>
          </Placeholder>
        </Page>
      );
      case "task":
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
                marginTop: "40px",
                animation: "fadeIn 0.6s ease forwards",
              }}
            >
              <h1 style={{ 
                fontSize: "1rem", 
                fontWeight: "bold", 
                marginBottom: "20px", 
                marginTop: "20px",
                textAlign: "center", 
                color: "#fff", 
                lineHeight: "1" }}>
                  ЗАВДАННЯ
              </h1>
            </div>
            <div
              className="page"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "10px",
                animation: "fadeIn 0.6s ease forwards",
              }}
            >
              <h1 style={{ 
                fontSize: "1rem", 
                fontWeight: "bold", 
                marginBottom: "50px", 
                marginTop: "50px",
                textAlign: "center", 
                color: "#fff", 
                lineHeight: "1" }}>
                  В робробці
              </h1>
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
                    }}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    >
                    ?
                  </p>
                  {showTooltip && ( // Відображаємо тултіп тільки якщо showTooltip === true
                  <div
                    style={{
                      position: "absolute", // Абсолютне позиціонування відносно батьківського div з relative
                      top: "20px", // Відступ зверху від батьківського div (можливо, потрібно підлаштувати)
                      right: "30px", // Позиціонуємо праворуч від батьківського div (можливо, потрібно підлаштувати)
                      // Можна спробувати позиціонувати ліворуч, якщо праворуч заважає:
                      // left: "0px",
                      // top: "20px",
                      background: "rgba(0, 0, 0, 0.85)", // Темний напівпрозорий фон
                      color: "#fff", // Білий текст
                      padding: "8px 12px", // Внутрішні відступи
                      borderRadius: "8px", // Закруглені кути
                      whiteSpace: "normal", // Дозволяємо тексту переноситись на новий рядок
                      maxWidth: "300px", // Обмежуємо максимальну ширину тултіпа
                      zIndex: 15, // Переконуємося, що тултіп під "?" але поверх іншого вмісту
                      pointerEvents: "none", // Тултіп не перехоплює події миші
                      fontSize: "0.9rem", // Розмір шрифту
                      lineHeight: "1.3", // Міжрядковий інтервал
                      textAlign: "left", // Вирівнювання тексту
                      transform: 'translateX(5%)', // Невеличкий зсув праворуч від правої межі батьківського блоку
                      // Якщо позиціонували ліворуч: transform: 'translateX(-105%)', // Зсув ліворуч від лівої межі батьківського блоку
                    }}
                  >
                    Це ваше місце сил, тут ви можете отримати  додаткові ресурси та енергію.
                  </div>
                )}
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
                 5🔷 2⚡ 2🪨
                </span> 
                <Link href="" style={{
                  fontSize: "0.6rem",
                  fontWeight: "lighter",
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: "1",
                  fontFamily: "Arial, sans-serif",
                  marginLeft: "auto",
                }}>
                  <Button style={{
                  fontSize: "16px",
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
                    <p style={{
                  fontSize: "12px",}}>{countdown > 0 ? `${formatTime(countdown)}` : "Отримати дари!"}</p>
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
              <div style={{
                  fontSize: "16px",}}>
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
                  fontSize: "16px",
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
                    <p style={{
                  fontSize: "12px",}}>⚔️ В подорож ⚔️</p>
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

  async function handleEquip(selectedItem: { mode: "city" | "inventory" | "equipped"| "sweapon"| "sshield"| "sscroll"; item_id: number; type: string; name: string; image: string; description: string; damage?: string; strength?: string; price: number; }) {
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

  async function handleDismantle(selectedItem: { mode: "city" | "inventory" | "equipped"| "sweapon"| "sshield"| "sscroll"; item_id: number; type: string; name: string; image: string; description: string; damage?: string; strength?: string; price: number; }) {
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

    toast.success(`Ви розібрали ${selectedItem.name} та отримали ${dismantleReward} уламків!`);
    await fetchInventory();
  }

  async function handleUnequip(selectedItem: { mode: "city" | "inventory" | "equipped" | "sweapon"| "sshield"| "sscroll"; item_id: number; type: string; name: string; image: string; description: string; damage?: string; strength?: string; price: number; }) {
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
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundImage: `url('/bg/Cardbg1.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    padding: "0px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "100%",
                    minHeight: "450px", // додано!
                    textAlign: "center",
                    filter: "drop-shadow(0 0px 40px rgb(255, 255, 255))",
                  }}
                >
                   <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      width: "100%",
                      height: "100%",
                      gap: "69%",
                    }} >
                    <p className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} 
                      style={{  
                        fontSize: "1rem",
                        fontWeight: "bolder",
                        fontFamily: "Arial, sans-serif",
                        position: "inherit",
                        padding: "4px",
                        marginTop:"30px",
                        borderRadius: "25px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.5)",
                        cursor: "default",
                      }}>
                        +0
                    </p>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "1rem",
                        fontWeight: "bolder",
                        fontFamily: "Arial, sans-serif",
                        position: "inherit",
                        padding: "4px",
                        paddingInline: "8px",
                        marginTop:"30px",
                        borderRadius: "25px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.5)",
                        cursor: "pointer",
                      }}>
                        x
                    </p>
                  </div>
                  <h2 className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px",marginTop:"-10px",cursor: "default", }}>{selectedItem.name}</h2>
                 
                  {selectedItem.image && (
                      <img 
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "130px", height: "80px", objectFit: "contain", marginBottom: "10px", marginTop: "30px", boxShadow: "0 0 40 rgb(253, 253, 253)", borderRadius: "360px", filter: "drop-shadow(0 0px 22px rgb(255, 255, 255))" }}
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
                  <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "67px" }}>
                    Захист: <strong>{selectedItem.defense}</strong>
                  </p>
                <div onClick={(e) => e.stopPropagation()}>
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      width: "100%",
                      height: "100%",
                      gap: "25px",
                    }} 
                  >
                    <button onClick={() => {confirmBuy();setSelectedItem(null);}}
                      style={{
                        backgroundColor:"#4caf50",
                        color: "#fff",
                        border: "none",
                        padding: "10px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                        width: "90%",
                        borderRadius:20,
                        marginTop: "-8px",
                        marginBottom:"28px",
                        marginLeft: "20px",
                      }}>
                        Так</button>
                    <button onClick={() => setSelectedItem(null)}
                      style={{
                        backgroundColor:"#f44336",
                        color: "#fff",
                        border: "none",
                        padding: "10px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                        width: "90%",
                        borderRadius:20,
                        marginTop: "-8px",
                        marginBottom:"28px",
                        marginRight: "20px",
                      }}>
                        Ні</button>

                  </div>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#ccc", position:"absolute", bottom: "65px", left: "30%", transform: "translateX(-50%)", }}>
                    Ціна:
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#ccc", position:"absolute", bottom: "65px", left: "70%", transform: "translateX(-50%)", }}>
                    <strong>{selectedItem.price} 🪨</strong>
                  </p>
                </div> 
              )}

              {selectedItem.mode === "inventory" && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundImage: `url('/bg/Cardbg1.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    padding: "0px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "100%",
                    minHeight: "450px", // додано!
                    textAlign: "center",
                    filter: "drop-shadow(0 0px 40px rgb(255, 255, 255))",
                  }}
                >

                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      width: "100%",
                      height: "100%",
                      gap: "69%",
                    }} >
                    <p className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} 
                      style={{  
                        fontSize: "1rem",
                        fontWeight: "bolder",
                        fontFamily: "Arial, sans-serif",
                        position: "inherit",
                        padding: "4px",
                        marginTop:"30px",
                        borderRadius: "25px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.5)",
                        cursor: "default",
                      }}>
                        +{selectedItem.upgrade_level}
                    </p>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "1rem",
                        fontWeight: "bolder",
                        fontFamily: "Arial, sans-serif",
                        position: "inherit",
                        padding: "4px",
                        paddingInline: "8px",
                        marginTop:"30px",
                        borderRadius: "25px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.5)",
                        cursor: "pointer",
                      }}>
                        x
                    </p>
                  </div>
                  <h2 className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px",marginTop:"-10px",cursor: "default", }}>{selectedItem.name}</h2>
                 
                  {selectedItem.image && (
                      <img 
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "130px", height: "80px", objectFit: "contain", marginBottom: "30px", marginTop: "30px", boxShadow: "0 0 40 rgb(253, 253, 253)", borderRadius: "360px", filter: "drop-shadow(0 0px 22px rgb(255, 255, 255))" }}
                    />
                  )}

                  <div style={{objectFit: "contain", marginBottom: "30px", marginTop: "10px", boxShadow: "0 0 40 rgba(253, 253, 253, 0.5)", borderRadius: "20px", border:"1px", cursor: "default", }}>
                    <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "20px", }}>
                      Тип: <strong>{selectedItem.type}</strong>
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "20px" }}>
                      Рідкість: <strong>{selectedItem.rarity}</strong>
                    </p>
                    {/* Обчислення покращених характеристик */}
                    {(() => {
                      const stats = getUpgradedStats(
                        {
                          damage: Number(selectedItem.damage) || 0,
                          defense: Number(selectedItem.defense) || 0,
                        },
                        selectedItem.upgrade_level ?? 0
                      );
                      return (
                        <>
                          <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "20px" }}>
                            Шкода: <strong>{stats.damage}</strong>
                          </p>
                          <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "60px" }}>
                            Захист: <strong>{stats.defense}</strong>
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      width: "100%",
                      height: "100%",
                    }} 
                  >
                    <button onClick={() => { handleDismantle(selectedItem); setSelectedItem(null); }}
                      style={{
                        backgroundColor: "#444",
                        border: "none",
                        fontSize: "0.7rem",
                        color: "rgb(190, 0, 0)",
                        background: "rgba(0, 0, 0, 0.06)",
                        borderRadius:20,
                        marginTop: "-8px",
                        marginBottom:"28px",
                        cursor: "pointer",
                        width: "100%",
                        fontWeight: "bolder",
                      }}>
                      💥 РОЗІБРАТИ 
                    </button>
                    {/* Умовна кнопка: СПОРЯДИТИ або ВИКОРИСТАТИ */}
                    {(selectedItem.type === 'weapon' || selectedItem.type === 'shield') && (
                      <button onClick={() => { handleEquip(selectedItem); setSelectedItem(null); }}
                        style={{
                          backgroundColor: "#444",
                          border: "none",
                          fontSize: "0.7rem",
                          color: "rgb(0, 255, 98)",
                          background: "rgba(0, 0, 0, 0)",
                          borderRadius:20,
                          marginTop: "-8px",
                          marginBottom:"28px",
                          cursor: "pointer",
                          width: "100%",
                        }}>
                        СПОРЯДИТИ 🫴
                      </button>
                    )}
                    {selectedItem.type === 'scroll' && (
                      <button onClick={() => { 
                        // Тут має бути ваша функція для використання предмету, наприклад handleUseItem
                        // handleUseItem(selectedItem); 
                        console.log("Використати предмет:", selectedItem.name); // Тимчасовий лог
                        setSelectedItem(null); 
                      }}
                        style={{
                          backgroundColor: "#444",
                          border: "none",
                          fontSize: "0.7rem",
                          color: "rgb(0, 255, 98)",
                          background: "rgba(0, 0, 0, 0)",
                          borderRadius:20,
                          marginTop: "-8px",
                          marginBottom:"28px",
                          cursor: "pointer",
                          width: "100%",
                        }}>
                        ✨ ВИКОРИСТАТИ
                      </button>
                    )}
                    {selectedItem.type === 'element' && (
                      <button onClick={() => { 
                        // Тут має бути ваша функція для використання предмету, наприклад handleUseItem
                        // handleUseItem(selectedItem); 
                        console.log("Використати предмет:", selectedItem.name); // Тимчасовий лог
                        setSelectedItem(null); 
                      }}
                        style={{
                          backgroundColor: "#444",
                          border: "none",
                          fontSize: "0.7rem",
                          color: "rgb(0, 255, 98)", 
                          background: "rgba(0, 0, 0, 0)",
                          borderRadius:20,
                          marginTop: "-8px",
                          marginBottom:"28px",
                          cursor: "pointer",
                          width: "100%",
                        }}>
                        ✨ ВИКОРИСТАТИ
                      </button>
                    )}
                    {/* Якщо є інші типи предметів, для яких потрібні інші кнопки або їх відсутність, 
                        можна додати ще умови сюди, або залишити так, щоб для непередбачених типів 
                        не було другої кнопки. 
                        Наприклад, якщо предмет не можна ні спорядити, ні використати, 
                        але можна розібрати, то буде тільки кнопка "РОЗІБРАТИ".
                    */}
                  </div>
                </div>
              )}

              {selectedItem.mode === "equipped" && (
                
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundImage: `url('/bg/Cardbg1.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    padding: "0px",
                    borderRadius: "10px",
                    color: "#fff",
                    maxWidth: "300px",
                    width: "100%",
                    minHeight: "450px", // додано!
                    textAlign: "center",
                    filter: "drop-shadow(0 0px 40px rgb(255, 255, 255))",
                  }}
                >
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      width: "100%",
                      height: "100%",
                      gap: "69%",
                    }} >
                    <p className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} 
                      style={{  
                        fontSize: "1rem",
                        fontWeight: "bolder",
                        fontFamily: "Arial, sans-serif",
                        position: "inherit",
                        padding: "4px",
                        marginTop:"30px",
                        borderRadius: "25px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.33)",
                        cursor: "default",
                      }}>
                        +{selectedItem.upgrade_level}
                    </p>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "1rem",
                        fontWeight: "bolder",
                        fontFamily: "Arial, sans-serif",
                        position: "inherit",
                        padding: "4px",
                        paddingInline: "8px",
                        marginTop:"30px",
                        borderRadius: "25px",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.33)",
                        cursor: "pointer",
                      }}>
                        x
                    </p>
                  </div>
                  <h2 className={` rarity-font-${selectedItem.rarity?.toLowerCase()}`} style={{ fontSize: "1.2rem", marginBottom: "10px",marginTop:"-10px",cursor: "default", }}>{selectedItem.name}</h2>
                 
                  {selectedItem.image && (
                      <img 
                      src={typeof selectedItem.image === "string" ? selectedItem.image : (selectedItem.image as { src: string }).src}
                      alt={selectedItem.name}
                      style={{ width: "130px", height: "80px", objectFit: "contain", marginBottom: "30px", marginTop: "30px", boxShadow: "0 0 40 rgb(253, 253, 253)", borderRadius: "360px", filter: "drop-shadow(0 0px 22px rgb(255, 255, 255))" }}
                    />
                  )}

                  <div style={{objectFit: "contain", marginBottom: "30px", marginTop: "10px", boxShadow: "0 0 40 rgba(253, 253, 253, 0.5)", borderRadius: "20px", border:"1px", cursor: "default", }}>
                    <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "20px", }}>
                      Тип: <strong>{selectedItem.type}</strong>
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "20px" }}>
                      Рідкість: <strong>{selectedItem.rarity}</strong>
                    </p>
                    {/* Обчислення покращених характеристик */}
                    {(() => {
                      const stats = getUpgradedStats(
                        {
                          damage: Number(selectedItem.damage) || 0,
                          defense: Number(selectedItem.defense) || 0,
                        },
                        selectedItem.upgrade_level ?? 0
                      );
                      return (
                        <>
                          <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "20px" }}>
                            Шкода: <strong>{stats.damage}</strong>
                          </p>
                          <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "60px" }}>
                            Захист: <strong>{stats.defense}</strong>
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      width: "100%",
                      height: "100%",
                      gap:20,
                    }} 
                  >
                    <button
                      style={{
                        backgroundColor: "#444",
                        border: "none",
                        fontSize: "0.7rem",
                        fontStyle: "italic",
                        fontFamily: "Arial, sans-serif",
                        fontWeight: "bolder",
                        color: "rgb(151, 151, 151)",
                        background: "rgba(0, 0, 0, 0.4)",
                        borderRadius:20,
                        marginTop: "-8px",
                        marginBottom:"28px",
                        cursor: "default",
                        width: "40%",
                      }}>
                        СПОРЯДЖЕНО
                    </button>
                    <button onClick={() => {handleUnequip(selectedItem);setSelectedItem(null);}}
                      style={{
                        backgroundColor: "#444",
                        border: "none",
                        fontSize: "0.7rem",
                        color: "#ffff",
                        background: "rgba(0, 0, 0, 0.4)",
                        borderRadius:20,
                        marginTop: "-8px",
                        marginBottom:"28px",
                        cursor: "pointer",
                        width: "40%",
                      }}>
                        ЗНЯТИ 🫳
                    </button>
                  </div>
                </div>
                
              )}

              {selectedItem.mode === "sweapon" && (
                <div
                  className={`item-image rarity-border-common rarity-shadow-common`}
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
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      marginBottom: "40px",
                      marginTop: "-20px",
                      width: "100%",
                      height: "100%",
                      gap: "70%",
                    }} >
                    <p
                      style={{  
                        position: "relative",
                        fontSize: "0.7rem",
                        fontWeight: "lighter",
                        fontFamily: "Arial, sans-serif",
                        fontVariantEmoji: "emoji",
                        color: "#ddd",
                        background: "rgba(0, 0, 0, 0.35)",
                        borderRadius: "50px",
                        padding: "8px",
                        width: "150px",
                        height: "10px",
                      }}>
                         ЗБРОЯ
                    </p>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "0.8rem",
                        fontWeight: "lighter",
                        fontFamily: "Arial, sans-serif",
                        fontVariantEmoji: "emoji",
                        color: "#ddd",
                        position: "inherit",
                        background: "rgba(0, 0, 0, 0.35)",
                        borderRadius: "50px",
                        padding: "8px",
                        width: "10px",
                        height: "10px",
                      }}>
                        X
                    </p>
                    
                  </div>
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
                    animation: "fadeIn 1s ease forwards",
                  }}
                >
                  {WeaponItems.map((item) => (
                    <ItemCard
                      mode={"city"}
                      key={item.item_id}
                      item_id={Number(item.item_id)}
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
                </div>
              )}

              {selectedItem.mode === "sshield" && (
                <div
                  className={`item-image rarity-border-common rarity-shadow-common`}
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
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      marginBottom: "40px",
                      marginTop: "-20px",
                      width: "100%",
                      height: "100%",
                      gap: "70%",
                    }} >
                    <p
                      style={{  
                        position: "relative",
                        fontSize: "0.7rem",
                        fontWeight: "lighter",
                        fontFamily: "Arial, sans-serif",
                        fontVariantEmoji: "emoji",
                        color: "#ddd",
                        background: "rgba(0, 0, 0, 0.35)",
                        borderRadius: "50px",
                        padding: "8px",
                        width: "150px",
                        height: "10px",
                      }}>
                         БРОНЯ
                    </p>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "0.8rem",
                        fontWeight: "lighter",
                        fontFamily: "Arial, sans-serif",
                        fontVariantEmoji: "emoji",
                        color: "#ddd",
                        position: "inherit",
                        background: "rgba(0, 0, 0, 0.35)",
                        borderRadius: "50px",
                        padding: "8px",
                        width: "10px",
                        height: "10px",
                      }}>
                        X
                    </p>
                    
                  </div>
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
                    animation: "fadeIn 1s ease forwards",
                  }}
                >
                  {ShieldItems.map((item) => (
                      <ItemCard
                        mode={"city"}
                        key={item.item_id}
                        item_id={Number(item.item_id)}
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
                </div>
              )}

              {selectedItem.mode === "sscroll" && (
                <div
                  className={`item-image rarity-border-common rarity-shadow-common`}
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
                  <div 
                    style={{
                      position: "relative",
                      flexDirection: "row",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "visible",
                      marginBottom: "40px",
                      marginTop: "-20px",
                      width: "100%",
                      height: "100%",
                      gap: "70%",
                    }} >
                    <p
                      style={{  
                        position: "relative",
                        fontSize: "0.7rem",
                        fontWeight: "lighter",
                        fontFamily: "Arial, sans-serif",
                        fontVariantEmoji: "emoji",
                        color: "#ddd",
                        background: "rgba(0, 0, 0, 0.35)",
                        borderRadius: "50px",
                        padding: "8px",
                        width: "150px",
                        height: "10px",
                      }}>
                         СУВОЇ
                    </p>
                    <p onClick={() => setSelectedItem(null)}
                      style={{  
                        fontSize: "0.8rem",
                        fontWeight: "lighter",
                        fontFamily: "Arial, sans-serif",
                        fontVariantEmoji: "emoji",
                        color: "#ddd",
                        position: "inherit",
                        background: "rgba(0, 0, 0, 0.35)",
                        borderRadius: "50px",
                        padding: "8px",
                        width: "10px",
                        height: "10px",
                      }}>
                        X
                    </p>
                    
                  </div>
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
                    animation: "fadeIn 1s ease forwards",
                  }}
                >
                  {ScrollItems.map((item) => (
                      <ItemCard
                        mode={"city"}
                        key={item.item_id}
                        item_id={Number(item.item_id)}
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
