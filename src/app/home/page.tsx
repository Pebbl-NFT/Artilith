"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { List, Placeholder, Card } from "@telegram-apps/telegram-ui";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { Toaster, toast } from "react-hot-toast";

// --- КОМПОНЕНТИ ---
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import { ItemCard } from "@/components/ItemCard";
import EquippedItemSlot from "@/components/Item/EquippedItemSlot";
import InventoryItemSlot from "@/components/Item/InventoryItemSlot";
import { Fountain } from '@/components/Fountain/Fountain';

// --- ДАНІ ТА ЛОГІКА ---
import { supabase } from "@/lib/supabaseClient";
import { MergedInventoryItem, fetchInventory as fetchInventoryHook } from "@/hooks/useInventory";
import { updateUserPoints } from "@/hooks/useUserPoints";
import { getPlayerStats } from "@/utils/getPlayerStats";

// --- ЗОБРАЖЕННЯ ---
import citybg from '../_assets/citybg.jpg';
import blacksmithbg from '../_assets/blacksmithbg.jpg';
import alleyofheroesnbg from '../_assets/alleyofheroesnbg.jpg';

type SelectedItemState = MergedInventoryItem & {
  mode: "inventory" | "equipped";
};

export default function HomePage() {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<MergedInventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);
  
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
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
      supabase.from("users").select("points, level, experience").eq("id", String(userId)).single(),
      fetchInventoryHook(String(userId)),
      supabase.from("users").select("id, first_name, level").order("level", { ascending: false })
    ]);
    
    if (userDataRes.data) {
      setPoints(userDataRes.data.points);
      setLevel(userDataRes.data.level ?? 1);
      setExperience(userDataRes.data.experience ?? 0);
    }
    setInventory(inventoryDataRes);
    if(playersDataRes.data) setPlayers(playersDataRes.data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [userId]);
  
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

  async function handleDismantle(item: MergedInventoryItem) {
    if (!userId) return;

    // Перевіряємо кількість предметів у стаку
    if (item.quantity > 1) {
      // Якщо предметів більше одного, просто зменшуємо кількість на 1
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: item.quantity - 1 })
        .eq('id', item.id);
      
      if (error) {
        toast.error("Помилка продажу предмета!");
        return;
      }

    } else {
      // Якщо предмет останній у стаку, видаляємо запис повністю
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', item.id);

      if (error) {
        toast.error("Помилка продажу предмета!");
        return;
      }
    }
    const dismantleReward = 15;
    if (dismantleReward > 0) {
        const newPoints = points + dismantleReward;
        await updateUserPoints(String(userId), newPoints);
        setPoints(newPoints);
        toast.success(`${item.name} розібрано. Отримано ${dismantleReward} уламків!`);
    } else {
        toast.success(`${item.name} розібрано.`);
    }
    await loadData();
    setSelectedItem(null);
  }

  const renderContent = () => {
    if (loading) return <Placeholder>Завантаження...</Placeholder>;

    switch (activeTab) {
      case "home":
        return (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
             <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginTop:"80px" }}>ДІМ</h1>
            <Card className="page">
                <div style={{display: "flex",flexDirection: "row",justifyContent: "center",alignItems: "center",marginBottom: -30,gap: "30px",padding: 10,color: "#fff"}}>
                  <p>{username}</p><p>Lv. {level}</p>
                </div>
                <div style={{display: "flex",flexDirection: "row",justifyContent: "center",alignItems: "center",fontSize: 10,gap: "10px",padding: 10,color: "#fff"}}>
                  <p>🔷 XP :</p>
                  <strong>{experience} / {getRequiredExp(level)} 🔷</strong>
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
          <Page back>
            <Placeholder style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 1s ease forwards", gap: "20px" }}>
              <div onClick={() => setActiveTab("blacksmith")} className="page" style={{ backgroundImage: `url(${blacksmithbg.src})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h1>КОВАЛЬ</h1></div>
              <div onClick={() => setActiveTab("guild")} className="page" style={{ backgroundImage: `url(${citybg.src})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h1>ГІЛЬДІЯ</h1></div>
              <div onClick={() => setActiveTab("alleyofheroes")} className="page" style={{ backgroundImage: `url(${alleyofheroesnbg.src})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h1>АЛЕЯ ГЕРОЇВ</h1></div>
            </Placeholder>
          </Page>
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
    <Page back={false}>
      <List>
        <TopBar points={points} />
        <div style={{ paddingBottom: 100 }}>{renderContent()}</div>

        {selectedItem && (
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
            <div onClick={(e) => e.stopPropagation()}>
              <ItemCard
                item={selectedItem}
                mode={selectedItem.mode}
                onEquipRequest={handleEquip}
                onUnequipRequest={handleUnequip}
                onSellRequest={handleDismantle}
                onClose={() => setSelectedItem(null)}
              />
            </div>
          </div>
        )}
      </List>
      <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Toaster position="top-center" reverseOrder={false} />
    </Page>
  );
}
