"use client";

import { useEffect, useState } from "react";
import { Button, Link, Placeholder, Image  } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";
import { getPlayerStats } from "@/utils/getPlayerStats";

export default function BattlePage() {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [playerStats, setPlayerStats] = useState({
    health: 10,
    attack: 0,
    defense: 0,
    energy: 10,
  });

  const [enemyStats, setEnemyStats] = useState({
    name: "Слиз",
    health: 8,
    attack: 2,
    defense: 0,
  });

  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInventory = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("inventory")
      .select("item_id, equipped, id")
      .eq("user_id", userId)
      .eq("equipped", true);

    if (error) {
      console.error("Помилка при завантаженні екіпіровки:", error.message);
      return;
    }

    const formatted = data.map((entry) => {
      const item = AllItems.find((i) => i.item_id === entry.item_id);
      return {
        ...item,
        id: entry.id,
        equipped: true,
      };
    });

    setInventory(formatted);
  };

  // 🔰 Розрахунок шкоди з урахуванням броні
  function calculateDamage(attack: number, defense: number): { defenseLoss: number; healthLoss: number } {
    const rawDamage = Math.max(attack, 0); // мінімум 1 шкоди
    if (defense >= rawDamage) {
      return { defenseLoss: rawDamage, healthLoss: 0 };
    } else {
      return { defenseLoss: defense, healthLoss: rawDamage - defense };
    }
  }

  const startBattle = () => {
    let playerHP = playerStats.health;
    let playerDEF = playerStats.defense;
    let enemyHP = enemyStats.health;
    let enemyDEF = enemyStats.defense;

    const log: string[] = [];

    while (playerHP > 0 && enemyHP > 0) {
      const playerHit = calculateDamage(playerStats.attack, enemyDEF);
      enemyDEF = Math.max(enemyDEF - playerHit.defenseLoss, 0);
      enemyHP = Math.max(enemyHP - playerHit.healthLoss, 0);
      log.push(`🧍 Гравець завдає ${playerHit.defenseLoss + playerHit.healthLoss} шкоди. Ворог: ${enemyHP} HP, ${enemyDEF} DEF`);

      if (enemyHP <= 0) break;

      const enemyHit = calculateDamage(enemyStats.attack, playerDEF);
      playerDEF = Math.max(playerDEF - enemyHit.defenseLoss, 0);
      playerHP = Math.max(playerHP - enemyHit.healthLoss, 0);
      log.push(`👾 Ворог завдає ${enemyHit.defenseLoss + enemyHit.healthLoss} шкоди. Гравець: ${playerHP} HP, ${playerDEF} DEF`);
    }

    const result = playerHP > 0 ? "🎉 Перемога!" : "💀 Поразка!";
    log.push(result);

    alert(log.join("\n"));
  };

  useEffect(() => {
    fetchInventory();
  }, [userId]);

  useEffect(() => {
    const stats = getPlayerStats(inventory);
    setPlayerStats(stats);
    setIsLoading(false);
  }, [inventory]);

  if (isLoading) return <div>Завантаження бою...</div>;

  return (
    <Page>
      <h1
        style={{
          marginTop: 80,
          textAlign: "center",
          fontSize: 24,
          fontWeight: "bold",
          color: "white",
        }}
      >
        Битва
      </h1>
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">⚔️ Битва з {enemyStats.name}</h2>

        <div className="mb-4">
          <p>🧍‍♂️ <strong>Гравець</strong></p>
          <p>Здоров'я: {playerStats.health}</p>
          <p>Атака: {playerStats.attack}</p>
          <p>Захист: {playerStats.defense}</p>
        </div>

        <div className="mb-4">
          <p>👾 <strong>{enemyStats.name}</strong></p>
          <p>Здоров'я: {enemyStats.health}</p>
          <p>Атака: {enemyStats.attack}</p>
          <p>Захист: {enemyStats.defense}</p>
        </div>

        <div className="mt-6">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={startBattle}
          >
            Почати бій (авто)
          </button>
        </div>
      </div>
      <Link href="/home">
              <Button
                mode="filled"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: 100,
                  background: 'var(--tgui--secondary_bg_color)',
                  padding: 10,
                  borderRadius: 50,
                  marginBottom: '20px',
                  border: '0px solid rgb(255, 255, 255)',
                }}
                name="back"
              >
                <p style={{ 
                  fontSize: "20px", 
                  color: "#fff", 
                  fontWeight: "bold" 
                }}>
                  👈 back</p>
              </Button>
            </Link>
    </Page>
    
  );
}
