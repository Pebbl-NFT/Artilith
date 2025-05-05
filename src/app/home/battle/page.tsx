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

  const [isHit, setIsHit] = useState(false);
  const [canAttack, setCanAttack] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [turnTimer, setTurnTimer] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [battleResult, setBattleResult] = useState<"win" | "lose" | null>(null);
  const [showLog, setShowLog] = useState(false);

  const hasMissedTurnRef = useRef(false);

  const enemyImage = (() => {
    switch (enemyStats.name) {
      case "Слиз":
        return "/enemies/slime.png";
      case "Гоблін":
        return "/images/enemies/goblin.png";
      default:
        return "/images/enemies/default.png";
    }
  })();

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
    if (battleResult) return; // Не запускаємо таймер, якщо бій завершено

    setTurnTimer(5);
    hasMissedTurnRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!hasMissedTurnRef.current && !battleResult) {
            hasMissedTurnRef.current = true;
            handleMissedTurn();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
  
        if (newHP <= 0) {
          setBattleResult("lose");
        } else {
          setCanAttack(true);
          startTurnTimer(); // 👉 Додаємо початок нового ходу
        }
  
        return newHP;
      });
  
      return newDEF;
    });
  };  

  const handleAttack = () => {
    if (!canAttack || playerHP <= 0 || enemyHP <= 0 || battleResult) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const playerHit = calculateDamage(playerStats.attack, enemyDEF);
    const newEnemyDEF = Math.max(enemyDEF - playerHit.defenseLoss, 0);
    const newEnemyHP = Math.max(enemyHP - playerHit.healthLoss, 0);
    setEnemyDEF(newEnemyDEF);
    setEnemyHP(newEnemyHP);
    setLog((prev) => [`🧍 Гравець завдає ${playerHit.defenseLoss + playerHit.healthLoss} шкоди.`, ...prev]);

    if (newEnemyHP <= 0) {
      setLog((prev) => ["🎉 Перемога!", ...prev]);
      setBattleResult("win");
      setCanAttack(false);
      clearInterval(timerRef.current!);
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
        setBattleResult("lose");
        clearInterval(timerRef.current!);
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
      <Link href="/home">
          <Button
            mode="filled"
            style={{
              width: "15%",
              borderRadius: 50,
              padding: "1rem",
              marginTop: "2rem",
              marginLeft: "2rem",
              fontSize: 18,
              fontWeight: "bold",
            }}
            name="back"
          >
            🏃‍♂️
          </Button>
        </Link>
      <Placeholder>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "0px",
          width:"100%",
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
        <div className="flex justify-center items-center h-64">
          <img
            src={enemyImage}
            alt={enemyStats.name}
            onClick={handleAttack}
            className={`h-30 w-30 object-contain cursor-pointer transition-transform duration-200 ${
              isHit ? "scale-110" : ""
            }`}
          />
        </div>
        </Placeholder>
        
        <Card className="page">
        <ProgressBar value={turnTimer} max={5} color="#fbbf24" />
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
        </Card>
        <p>Лог бою</p>
        <Card className="page" >
        <div
        style={{
          position: "absolute",
          borderRadius: 50,
          padding: "2rem",
          fontSize: 18,
          fontWeight: "bold",
        }}>
          {log.map((entry, idx) => (
            <div key={idx}>{entry}</div>
          ))}
        </div>
        </Card>
      </div>
      </Placeholder>
        {battleResult && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1000,
            flexDirection: "column", color: "#fff", padding: 20,
          }}>
            <h2>{battleResult === "win" ? "🎉 Перемога!" : "💀 Поразка!"}</h2>
            <p>✨ Ваша нагорода ✨</p>
            <p>🪨 ? / 💡 ? </p>

            <Button onClick={() => setShowLog(prev => !prev)} style={{ marginTop: 12, backgroundColor:"rgb(92, 92, 92)", }}>
              📜 {showLog ? "Сховати лог бою" : "Переглянути лог бою"}
            </Button>

            <Button onClick={() => location.reload()} style={{ marginTop: 12, backgroundColor:"rgb(92, 92, 92)",}}>
              🔁 Спробувати ще
            </Button>

            <Link href="/home">
              <Button style={{ marginTop: 12, backgroundColor:"rgb(92, 92, 92)", }}>
                👈 Покинути бій
              </Button>
            </Link>

            {showLog && (
              <div style={{
                marginTop: 16, maxHeight: 200, overflowY: "auto",
                padding: 12, border: "1px solid #fff", borderRadius: 8,
                backgroundColor: "#111", width: "90%",
              }}>
                {log.map((entry, idx) => (
                  <div key={idx}>{entry}</div>
                ))}
              </div>
            )}
          </div>
        )}
    </Page>
  );
}
