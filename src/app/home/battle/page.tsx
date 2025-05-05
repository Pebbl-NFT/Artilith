"use client";

import { useEffect, useState, useRef } from "react";
import { Button, Link, Card, Placeholder } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";
import { getPlayerStats } from "@/utils/getPlayerStats";

export default function BattlePage() {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [playerStats, setPlayerStats] = useState({ health: 10, attack: 0, defense: 0, energy: 10 });
  const [enemyStats, setEnemyStats] = useState({ name: "Слиз", health: 8, attack: 2, defense: 0 });

  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [playerHP, setPlayerHP] = useState(10);
  const [playerDEF, setPlayerDEF] = useState(0);
  const [enemyHP, setEnemyHP] = useState(8);
  const [enemyDEF, setEnemyDEF] = useState(0);

  const [canAttack, setCanAttack] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [turnTimer, setTurnTimer] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hasMissedTurnRef = useRef(false);


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
      return { ...item, id: entry.id, equipped: true };
    });

    setInventory(formatted);
  };

  function calculateDamage(attack: number, defense: number): { defenseLoss: number; healthLoss: number } {
    const rawDamage = Math.max(attack, 0);
    if (defense >= rawDamage) {
      return { defenseLoss: rawDamage, healthLoss: 0 };
    } else {
      return { defenseLoss: defense, healthLoss: rawDamage - defense };
    }
  }

  const ProgressBar = ({ value, max, color = "#4ade80" }: { value: number, max: number, color?: string }) => {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));
  
    return (
      <div style={{
        width: '100%',
        height: 12,
        backgroundColor: '#333',
        borderRadius: 6,
        overflow: 'hidden',
        marginTop: 4,
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    );
  };
  

  const startTurnTimer = () => {
  setTurnTimer(15);
  hasMissedTurnRef.current = false; // Скидаємо прапорець

  if (timerRef.current) clearInterval(timerRef.current);

  timerRef.current = setInterval(() => {
    setTurnTimer(prev => {
      if (prev <= 1) {
        clearInterval(timerRef.current!);
        if (!hasMissedTurnRef.current) {
          hasMissedTurnRef.current = true;
          handleMissedTurn();
        }
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};


  //Пропуск ходу
  const handleMissedTurn = () => {
    if (!canAttack || playerHP <= 0 || enemyHP <= 0) return;
  
    setCanAttack(false); // блокуємо дублювання
    setLog((prev) => ["⏱️ Ви пропустили хід!", ...prev]);
  
    setPlayerDEF(prevDEF => {
      const enemyHit = calculateDamage(enemyStats.attack, prevDEF);
      const newDEF = Math.max(prevDEF - enemyHit.defenseLoss, 0);
  
      setPlayerHP(prevHP => {
        const newHP = Math.max(prevHP - enemyHit.healthLoss, 0);
  
        setLog((prev) => [
          `👾 Ворог завдає ${enemyHit.defenseLoss + enemyHit.healthLoss} шкоди.`,
          ...(newHP <= 0 ? ["💀 Поразка!"] : []),
          ...prev,
        ]);
  
        if (newHP > 0) {
          setCanAttack(true);
          startTurnTimer(); // запустити новий хід
        }
  
        return newHP;
      });
  
      return newDEF;
    });
  };
  


  const handleAttack = () => {
    if (!canAttack || playerHP <= 0 || enemyHP <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const playerHit = calculateDamage(playerStats.attack, enemyDEF);
    const newEnemyDEF = Math.max(enemyDEF - playerHit.defenseLoss, 0);
    const newEnemyHP = Math.max(enemyHP - playerHit.healthLoss, 0);
    setEnemyDEF(newEnemyDEF);
    setEnemyHP(newEnemyHP);
    setLog((prev) => [`🧍 Гравець завдає ${playerHit.defenseLoss + playerHit.healthLoss} шкоди.`, ...prev]);

    if (newEnemyHP <= 0) {
      setLog((prev) => ["🎉 Перемога!", ...prev]);
      setCanAttack(false);
      return;
    }

    setCanAttack(false);

    setTimeout(() => {
      const enemyHit = calculateDamage(enemyStats.attack, playerDEF);
      const newPlayerDEF = Math.max(playerDEF - enemyHit.defenseLoss, 0);
      const newPlayerHP = Math.max(playerHP - enemyHit.healthLoss, 0);
      setPlayerDEF(newPlayerDEF);
      setPlayerHP(newPlayerHP);
      setLog((prev) => [`👾 Ворог завдає ${enemyHit.defenseLoss + enemyHit.healthLoss} шкоди.`, ...prev]);

      if (newPlayerHP <= 0) {
        setLog((prev) => ["💀 Поразка!", ...prev]);
        return;
      }

      setCanAttack(true);
      startTurnTimer();
    }, 1000);
  };

  useEffect(() => {
    fetchInventory();
  }, [userId]);

  useEffect(() => {
    const stats = getPlayerStats(inventory);
    setPlayerStats(stats);
    setPlayerHP(stats.health);
    setPlayerDEF(stats.defense);
    setEnemyHP(enemyStats.health);
    setEnemyDEF(enemyStats.defense);
    setIsLoading(false);
    setCanAttack(true);
    startTurnTimer();
  }, [inventory]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (isLoading) return <div>Завантаження бою...</div>;

  return (
    <Page back >
      <Placeholder>
      <div
        className="page"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "0px",
          animation: "fadeIn 1s ease forwards",
        }}
      >
        <Card className="page">
          <h3> {enemyStats.name}</h3>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>{enemyHP} </span>
                <span>❤️ </span>
                <span>{enemyStats.health} </span>
              </div>
              <ProgressBar value={enemyHP} max={enemyStats.health} color="rgba(218, 48, 48, 0.73)" />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "40px",
              marginTop: "30px",
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
            }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                <span>🗡️ </span>
                <span>{enemyStats.attack} </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>            
                <span>🛡️</span>
                <span>{enemyDEF} </span>
              </div>
          </div>
        </Card>

        <Placeholder className="w-full">
          <div className="flex flex-col gap-3 items-center w-full">
            <ProgressBar value={turnTimer} max={15} color="#fbbf24" />
            <button
              disabled={!canAttack || playerHP <= 0 || enemyHP <= 0}
              onClick={handleAttack}
              className={`w-full px-6 py-3 rounded-full text-lg font-semibold transition ${
                canAttack ? "bg-red-600 text-white" : "bg-gray-500 text-gray-300"
              }`}
            >
              🔥 Атакувати
            </button>
          </div>
        </Placeholder>
        
        <Card className="page">
          <h3> Ваші характеристики</h3>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>{playerHP} </span>
                <span>❤️ </span>
                <span>{playerStats.health} </span>
              </div>
          <ProgressBar value={playerHP} max={playerStats.health} color="rgba(60, 255, 0, 0.73)" />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "40px",
              marginTop: "30px",
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
            }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                <span>🗡️ </span>
                <span>{playerStats.attack} </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>            
                <span>🛡️</span>
                <span>{playerDEF} </span>
              </div>
          </div>
          <Link href="/home">
          <Button
            mode="filled"
            style={{
              width: "100%",
              borderRadius: 50,
              padding: "1rem",
              marginTop: "2rem",
              fontSize: 18,
              fontWeight: "bold",
            }}
            name="back"
          >
            👈 Вийти з бою
          </Button>
        </Link>
        </Card>

        <div className="text-sm h-32 overflow-y-auto border-t border-white/20 pt-4">
          {log.map((entry, idx) => (
            <div key={idx}>{entry}</div>
          ))}
        </div>
      </div>
      </Placeholder>
    </Page>
  );
  
}
