"use client";

import React, { useEffect, useState, useCallback, useMemo, CSSProperties } from "react";
import Image from "next/image";
import { List, Placeholder, Card } from "@telegram-apps/telegram-ui";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { Toaster, toast } from "react-hot-toast";
import { useRouter } from 'next/navigation';

// --- КОМПОНЕНТИ ---
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import { ItemCard } from "@/components/ItemCard";
import EquippedItemSlot from "@/components/Item/EquippedItemSlot";
import InventoryItemSlot from "@/components/Item/InventoryItemSlot";
import { Fountain } from '@/components/Fountain/Fountain';
// --- FIX: Імпортуємо нові компоненти та хуки ---
import { useEnergy } from "@/context/EnergyContext";
import { EnergyRefillModal } from "@/components/EnergyRefillModal";

// --- ДАНІ ТА ЛОГІКА ---
import { supabase } from "@/lib/supabaseClient";
import { MergedInventoryItem, fetchInventory as fetchInventoryHook } from "@/hooks/useInventory";
import { updateUserPoints } from "@/hooks/useUserPoints";
import { getPlayerStats } from "@/utils/getPlayerStats";

// --- ЗОБРАЖЕННЯ ---
import shopbg from '../_assets/shopbg.jpg';
import citybg from '../_assets/citybg.jpg';
import blacksmithbg from '../_assets/blacksmithbg.jpg';
import alleyofheroesnbg from '../_assets/alleyofheroesnbg.jpg';

type SelectedItemState = MergedInventoryItem & {
  mode: "inventory" | "equipped";
};

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}

useEffect(() => {
  // Цей код виконається один раз при завантаженні сторінки
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    // Повідомляємо Telegram, що додаток готовий
    window.Telegram.WebApp.ready();
    
    // Це також активує аналітику
    console.log("Telegram WebApp SDK is ready.");
  }
}, []);

export default function HomePage() {
  const router = useRouter();
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  // --- FIX: Отримуємо все для модального вікна з EnergyContext ---
  const { 
    energy, 
    maxEnergy, 
    isModalOpen, 
    closeEnergyModal, 
    timeToNextFormatted 
  } = useEnergy();

  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<MergedInventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);
  
  const [userData, setUserData] = useState({
  points: 0,
  level: 1,
  experience: 0,
  atl_balance: 0,
  ton_balance: 0,
  });

  // Add level, points, and experience as separate state variables
  const [level, setLevel] = useState(1);
  const [points, setPoints] = useState(0);
  const [experience, setExperience] = useState(0);
  const [players, setPlayers] = useState<{ id: any; first_name: any; level: any }[]>([]);

  const username = useMemo(() => initDataState?.user?.firstName || 'User', [initDataState]);
  const heroStats = useMemo(() => getPlayerStats(inventory, level), [inventory, level]);
  const equippedItems = useMemo(() => inventory.filter(item => item.equipped), [inventory]);
  const unequippedItems = useMemo(() => inventory.filter(item => !item.equipped), [inventory]);
  
  const getRequiredExp = (level: number): number => 100 * Math.pow(2, level - 1);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [userDataRes, inventoryDataRes, playersDataRes] = await Promise.all([
      supabase.from("users").select("points, level, experience, atl_balance, ton_balance").eq("id", String(userId)).single(),
      fetchInventoryHook(String(userId)),
      supabase.from("users").select("id, first_name, level").order("level", { ascending: false })
    ]);
    
    if (userDataRes.data) {
      setUserData(userDataRes.data);
    }
    setInventory(inventoryDataRes);
    if(playersDataRes.data) setPlayers(playersDataRes.data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  async function handleEquip(item: MergedInventoryItem) {
    if (!userId) return;
    setSelectedItem(null); // Одразу закриваємо модальне вікно
    
    // Викликаємо одну-єдину функцію, яка робить всю магію
    const { error } = await supabase.rpc('equip_item', {
        p_user_id: String(userId),
        p_inventory_id: item.id // Передаємо ID запису в інвентарі
    });

    if (error) {
        toast.error(`Помилка екіпірування: ${error.message}`);
        console.error("Equip error:", error);
    } else {
        toast.success(`Ви спорядили ${item.name}!`);
    }

    // Оновлюємо дані, щоб побачити фінальний результат
    await loadData();
}

async function handleUnequip(item: MergedInventoryItem) {
    if (!userId) return;
    setSelectedItem(null);

    // Шукаємо, чи існує стак для об'єднання (той самий предмет, того ж рівня, не екіпірований)
    const existingStack = inventory.find(i => 
        !i.equipped && 
        i.item_id === item.item_id &&
        i.upgrade_level === item.upgrade_level
    );

    if (existingStack) {
        // Якщо стак є, об'єднуємо
        const updates = [
            // Збільшуємо кількість існуючого стаку
            supabase
                .from('inventory')
                .update({ quantity: existingStack.quantity + item.quantity })
                .eq('id', existingStack.id),
            // Видаляємо екіпірований предмет
            supabase
                .from('inventory')
                .delete()
                .eq('id', item.id)
        ];
        await Promise.all(updates);
    } else {
        // Якщо стаку немає, просто знімаємо позначку 'equipped'
        await supabase
            .from('inventory')
            .update({ equipped: false })
            .eq('id', item.id);
    }

    toast.success(`Ви зняли ${item.name}!`);
    await loadData();
}

  function handleGoToTrade() {
    router.push('/trade');
  }

  async function handleCancelListing(item: MergedInventoryItem) {
    if (!userId) {
      toast.error("Не вдалося визначити користувача.");
      return;
    }

    // Одразу закриваємо вікно для кращого UX
    setSelectedItem(null); 
    toast.loading("Скасовуємо лот...");

    const { error } = await supabase.rpc('cancel_market_listing', {
      p_inventory_id: item.id, // ID предмета з інвентаря
      p_user_id: String(userId)  // ID поточного гравця
    });

    toast.dismiss();
    if (error) {
      toast.error(`Помилка: ${error.message}`);
    } else {
      toast.success("Лот знято з продажу!");
    }
    
    // Оновлюємо всі дані на сторінці, щоб побачити зміни
    await loadData();
  }

  const handleRefillWithStars = async () => {
    closeEnergyModal(); // Одразу закриваємо вікно

    // Перевіряємо, чи доступний об'єкт Telegram WebApp
    if (!window.Telegram?.WebApp) {
      toast.error("Функція оплати недоступна.");
      console.error("Telegram WebApp not found.");
      return;
    }

    const TWA = window.Telegram.WebApp;

    // --- Параметри покупки ---
    const starsAmount = 5; // Приклад: скільки зірок коштує поповнення
    
    // Показуємо нативне вікно підтвердження від Telegram
    TWA.showConfirm(`Поповнити енергію за ${starsAmount} ⭐️?`, async (isConfirmed: boolean) => {
      if (isConfirmed) {
        // Якщо гравець натиснув "Так"
        TWA.showProgress(); // Показуємо індикатор завантаження

        try {
          // ТУТ БУДЕ ВИКЛИК ВАШОГО БЕКЕНДУ
          // Наприклад, через Supabase Edge Function
          const { error } = await supabase.functions.invoke('process-star-payment', {
            body: { stars: starsAmount }
          });

          if (error) {
            throw new Error(error.message);
          }
          
          // Якщо все пройшло успішно на бекенді
          TWA.hideProgress();
          toast.success("Енергію поповнено!");
          
          // Оновлюємо дані, щоб побачити нову енергію
          // Вам потрібно буде додати функцію syncEnergy до вашого useEnergy хука
          // і повернути її, щоб викликати звідси.
          // Або просто викликати loadData(), якщо він оновлює енергію.
          await loadData(); 

        } catch (err: any) {
          TWA.hideProgress();
          TWA.showAlert(`Помилка оплати: ${err.message}`);
          console.error("Payment processing error:", err);
        }
      }
    });
  };

  const renderContent = () => {
    if (loading) return <Placeholder>Завантаження...</Placeholder>;

    switch (activeTab) {
      case "home":
        return (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
             <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginTop:"80px" }}>ДІМ</h1>
            <Card className="page">
                <div style={{display: "flex",flexDirection: "row",justifyContent: "center",alignItems: "center",marginBottom: -30,gap: "30px",padding: 10,color: "#fff"}}>
                  <p>{username}</p><p>Lv. {userData.level}</p>
                  <div
                    onClick={() => router.push('/home/profile')}
                    style={{
                        position: 'absolute',
                        right: '10px', // Відступ від правого краю
                        top: '8%',
                        transform: 'translateY(-60%)',
                        width: '50px', // Розмір квадрата
                        height: '30px', // Розмір квадрата
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: '16px', // Розмір іконки
                    }}
                  > ⚙️
                  </div>
                </div>
                <div style={{display: "flex",flexDirection: "row",justifyContent: "center",alignItems: "center",fontSize: 10,gap: "10px",padding: 10,color: "#fff"}}>
                  <p>🔷 XP :</p>
                  <strong>{userData.experience} / {getRequiredExp(userData.level)} 🔷</strong>
                </div>
                <div style={{position: "relative",display: "flex",flexDirection: "column",alignItems: "center",justifyContent: "center",marginTop: 10,marginBottom: 30,color: "#fff"}}>
                  <Image src="/hero/heroidle.png" alt="Персонаж" width={270} height={270} style={{ objectFit: "contain" , marginRight:-50, marginLeft: -30 }}/>
                  <div style={{position: "absolute",top: "50%",left: "0%",transform: "translate(-80%, -50%)",display: "grid",gridTemplateColumns: "repeat(1, 1fr)",gap: '10px'}}>
                    <EquippedItemSlot 
                      item={equippedItems.find(i => i.item_type === "weapon")} 
                      fallbackIcon=""
                      onClick={(item) => {
                        if (item) setSelectedItem({ ...item, mode: "equipped" });
                      }} 
                    />
                    <EquippedItemSlot 
                      item={equippedItems.find(i => i.item_type === "shield")} 
                      fallbackIcon=""
                      onClick={(item) => {
                        if (item) setSelectedItem({ ...item, mode: "equipped" });
                      }} 
                    />
                  </div>
                </div>
                <div style={{display: "flex",flexDirection: "row",justifyContent: "space-around",alignItems: "center",gap: "30px",padding: 10,color: "#fff",width: '100%'}}>
                  <span>❤️ {heroStats.health}</span>
                  <span>🗡️ {heroStats.attack}</span>
                  <span>🛡️ {heroStats.defense}</span>
                </div>
            </Card>

            <h2 style={{ textAlign: 'center', margin: '20px 0', color: '#fff' }}>ІНВЕНТАР</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "20px", width: '100%' }}>
              {unequippedItems.length > 0 ? (
                unequippedItems.map((item) => (
                  <InventoryItemSlot
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem({ ...item, mode: "inventory" })}
                  />
                ))
              ) : ( <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#ccc' }}>Інвентар порожній.</p> )}
            </div>
          </div>
        );

      case "city":
      return (
          <div style={styles.cityContainer}>
              <h1 style={styles.cityTitle}>Місто</h1>
              <CityNavigationCard 
                  title="Торгівля"
                  description="Купуйте та продавайте предмети"
                  imageUrl={shopbg.src}
                  onClick={() => router.push('/trade')}
              />
              <CityNavigationCard 
                  title="Коваль"
                  description="Покращуйте своє спорядження"
                  imageUrl={blacksmithbg.src}
                  onClick={() => { /* дія для Коваля */ }}
              />
              <CityNavigationCard 
                  title="Гільдія"
                  description="Об'єднуйтесь з іншими гравцями"
                  imageUrl={citybg.src}
                  onClick={() => { /* дія для Гільдії */ }}
              />
              <CityNavigationCard 
                  title="Алея Героїв"
                  description="Переглядайте таблиці лідерів"
                  imageUrl={alleyofheroesnbg.src}
                  onClick={() => { /* дія для Алеї */ }}
              />
          </div>
      );
      
      case "adventures":
        return (
          <div style={{ padding: '0 16px' }}>
            <Fountain />
          </div>
        );
        
      default:
        return <Placeholder>Незабаром...</Placeholder>;
    }
  };

  return (
    <Page>
      <List>
        <TopBar 
          points={userData.points} 
          atl_balance={userData.atl_balance}
          ton_balance={userData.ton_balance}
        />
        <div style={{ paddingBottom: 100, paddingTop: 70 }}>{renderContent()}</div>

        {/* Картка предмету (модальне вікно) */}
        {selectedItem && (
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
            <div onClick={(e) => e.stopPropagation()}>
              <ItemCard
                item={selectedItem}
                mode={selectedItem.mode}
                onEquipRequest={handleEquip}
                onUnequipRequest={handleUnequip}
                onSellRequest={handleGoToTrade}
                onClose={() => setSelectedItem(null)}
                onCancelSellRequest={handleCancelListing}
              />
            </div>
          </div>
        )}

        {/* --- ОСНОВНА ЗМІНА ТУТ: Модальне вікно енергії --- */}
        <EnergyRefillModal
          isOpen={isModalOpen}
          onClose={closeEnergyModal}
          onRefill={handleRefillWithStars}
          timeToNextFormatted={timeToNextFormatted}
          currentEnergy={energy}
          maxEnergy={maxEnergy}
        />

      </List>
      <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Toaster position="top-center" reverseOrder={false} />
    </Page>
  );
}

// --- НОВИЙ КОМПОНЕНТ ДЛЯ НАВІГАЦІЇ В МІСТІ ---
interface CityNavigationCardProps {
    title: string;
    description: string;
    imageUrl: string;
    onClick: () => void;
}

const CityNavigationCard: React.FC<CityNavigationCardProps> = ({ title, description, imageUrl, onClick }) => {
    return (
        <div style={styles.cityCard} onClick={onClick}>
            <div style={styles.cityCardThumbnail}>
                <Image src={imageUrl} alt={title} layout="fill" objectFit="cover" />
            </div>
            <div style={styles.cityCardContent}>
                <h3 style={styles.cityCardTitle}>{title}</h3>
                <p style={styles.cityCardDescription}>{description}</p>
            </div>
        </div>
    );
}

// --- НОВІ СТИЛІ ---
const styles: { [key: string]: CSSProperties } = {
    cityContainer: {
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    cityCard: {
    display: 'flex',
    flexDirection: 'column', // <--- ОСНОВНА ЗМІНА: тепер елементи йдуть зверху вниз
    alignItems: 'center',    // Центрує все по горизонталі
    gap: '12px',              // Відстань між картинкою і текстом
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    width: '100%', // Картка займає всю ширину контейнера
    boxSizing: 'border-box',
},
cityCardThumbnail: {
    width: '100%',
    height: '220px', // <--- Збільште це значення (було 80px)
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
},
cityCardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Центрує текст
},
cityCardTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff',
},
cityCardDescription: {
    margin: '4px 0 0 0',
    fontSize: '0.9rem',
    color: '#a7b3d9',
},
cityTitle: {
    fontFamily: "'Cinzel', serif",
    textAlign: 'center', // <--- Цей рядок центрує текст
    fontSize: '2.5rem',
    color: '#fefce8',
    margin: '0 0 20px 0', // Відступ знизу
    textShadow: '0 0 10px rgba(250, 204, 21, 0.5)'
},
};
