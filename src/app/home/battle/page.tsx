"use client";

import { useEffect, useState, useRef, useCallback} from "react";
import { Button, Link, Card, Placeholder } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";
import { getPlayerStats } from "@/utils/getPlayerStats";
import { reduceEnergy } from "@/utils/reduceEnergy";
import { Toaster, toast } from "react-hot-toast";
import { generateSequentialEnemy, Enemy} from '@/lib/generateEnemy';
import { baseEnemies, EnemyBase } from '@/lib/generateEnemy';

export default function BattlePage() {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [playerStats, setPlayerStats] = useState({ health: 10, attack: 0, defense: 0});

  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [energy, setEnergy] = useState(10);
  const hasShownToast = useRef(false);

  const [points, setPoints] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1); // за замовчуванням рівень 1
  const [experience, setExperience] = useState(0);

  const [enemyStats, setEnemyStats] = useState<Enemy | null>(null);
  const [enemyHP, setEnemyHP] = useState(0);
  const [enemyImage, setEnemyImage] = useState("");
  const [playerHP, setPlayerHP] = useState(10);
  const [playerDEF, setPlayerDEF] = useState(0);
  const [enemyDEF, setEnemyDEF] = useState(0);
  const [encounterNumber, setEncounterNumber] = useState(1);

  const [isHit, setIsHit] = useState(false);
  const [canAttack, setCanAttack] = useState(true);
  const canAttackRef = useRef(true);
  const [log, setLog] = useState<string[]>([]);
  const [turnTimer, setTurnTimer] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [battleResult, setBattleResult] = useState<"win" | "lose" | null>(null);
  const [showLog, setShowLog] = useState(false);

  const [showPreBattle, setShowPreBattle] = useState(true);

  const [hitText, setHitText] = useState<null | { value: number, id: number }>(null);
  const hitIdRef = useRef(0);
  const [isEnemyHit, setIsEnemyHit] = useState(false);

  const hasMissedTurnRef = useRef(false);

  // Завантажуємо дані користувача із Supabase
  const fetchUserData = async () => {
      if (!userId) return;

      const { data, error } = await supabase
          .from("users")
          .select("points, click_delay, energy, experience, level")
          .eq("id", userId)
          .single();

      if (error) {
          console.error("Помилка завантаження даних користувача:", error);
          toast.error("Не вдалося завантажити дані користувача.");
      } else if (data) {
          setPoints(data.points);
          setEnergy(data.energy);
          setPlayerLevel(data.level);
          setExperience(data.experience ?? 0);

          if (data.energy <= 0 && !hasShownToast.current) {
              toast.error("У вас закінчилася енергія ⚡");
              hasShownToast.current = true;
          }
      }
  };

  // Використовуйте fetchUserData у useEffect
  useEffect(() => {
      fetchUserData(); // Викликаємо функцію
  }, [userId]);

  const updateCanAttack = (value: boolean) => {
    setCanAttack(value);
    canAttackRef.current = value;
  };

  const appendToLog = (newEntries: string[]) => {
    setLog(prev => {
      if (prev.some(line => line.includes("Перемога") || line.includes("Поразка"))) {
        return prev; // лог вже завершений
      }
      return [...newEntries, ...prev];
    });
  };
  
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
        height: 5,
        backgroundColor: '#333',
        borderRadius: 6,
        border: '1px solid rgb(32, 32, 32)',
        overflow: 'hidden',
        marginTop: 0,
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

    setTurnTimer(15);
    hasMissedTurnRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!); // Зупинка таймера

          // Викликаємо handleMissedTurn
          handleMissedTurn();

          return 0; // Повертаємо 0, вичерпавши таймер
        }
        return prev - 1; // Зниження таймера
      });
    }, 1000); // Зменшення таймера кожну секунду
  };

  const handleMissedTurn = () => {
    if (!enemyStats) return; // Переконайтеся, що ворог існує

    toast.error("Ви пропустили свій хід!"); // Сповіщення про пропущений хід

    // Розрахунок шкоди від ворога
    const enemyHit = calculateDamage(enemyStats.damage, playerDEF);
    const newDEF = Math.max(playerDEF - enemyHit.defenseLoss, 0);
    const newHP = Math.max(playerHP - enemyHit.healthLoss, 0);

    // Оновлення логів
    const newLog = [
      `⏱️ Ви пропустили хід!`,
      `👾 Ворог завдає ${enemyHit.defenseLoss + enemyHit.healthLoss} шкоди.`,
      ...(newHP <= 0 ? ["💀 Поразка!"] : []),
    ];

    // Оновлення станів
    setPlayerDEF(newDEF);
    setPlayerHP(newHP);
    setLog(prev => [...newLog, ...prev]);

    // Перевірка на поразку
    if (newHP <= 0) {
      setBattleResult("lose"); // Якщо гравець програв
      clearInterval(timerRef.current!); // Зупинка таймера
    } else {
      setCanAttack(true); // Дозволити гравцеві атакувати
      startTurnTimer(); // Запускаємо таймер на наступний хід
    }
  };

  // Функція оновлення нагород
  async function updateRewardInSupabase(rewardPoints: number, rewardExp: number) {
      console.log(`Оновлення нагороди: ${rewardPoints} очок, ${rewardExp} досвіду`);

      const { data: userData, error: fetchError } = await supabase
          .from("users")
          .select("points, experience, level")
          .eq("id", userId) // Використовуємо userId з state, а не запитуємо getUser()
          .single();

      if (fetchError) {
          console.error("Помилка завантаження даних:", fetchError.message);
          return;
      }

      const currentPoints = (userData?.points || 0);
      const currentExperience = (userData?.experience || 0);
      const currentLevel = (userData?.level || 1);

      const newPoints = currentPoints + rewardPoints;
      let newExperience = currentExperience + rewardExp;
      let newLevel = currentLevel;

      // Підрахунок нового рівня
      while (newExperience >= getRequiredExp(newLevel)) {
          newExperience -= getRequiredExp(newLevel);
          newLevel++;
          console.log(`Перейшли на новий рівень! Тепер ви рівень ${newLevel}`);
      }

      // Оновлення даних
      const { error } = await supabase
          .from("users")
          .upsert({
              id: userId, // Використовуємо userId для оновлення даних
              points: newPoints,
              experience: newExperience,
              level: newLevel,
          }, { onConflict: "id" });

      if (error) {
        console.error("Помилка оновлення:", error.message);
      } else {
        console.log(`Нагорода оновлена: ${rewardPoints} очок і ${rewardExp} досвіду успішно.`);
        toast.success(`+${rewardPoints} очок та +${rewardExp} XP!`);
      }
  }
    // Функція для розрахунку досвіду
  const getRequiredExp = (level: number): number => {
      return 100 * Math.pow(2, level - 1); // 1 рівень = 100 XP, 2 рівень = 200, 3 рівень = 400 і т.д.
  };

    const handleAttack = () => {
    if (!enemyStats) return;
    if (!canAttack || playerHP <= 0 || enemyHP <= 0 || battleResult) return;
    setCanAttack(false);

    // Рахуємо і одразу задаємо нові стани
    const playerHit = calculateDamage(playerStats.attack, enemyDEF);
    const afterEnemyDEF = Math.max(enemyDEF - playerHit.defenseLoss, 0);
    const afterEnemyHP = Math.max(enemyHP - playerHit.healthLoss, 0);

    setEnemyDEF(afterEnemyDEF);
    setEnemyHP(afterEnemyHP);

    setHitText({ value: playerHit.defenseLoss + playerHit.healthLoss, id: Date.now() });
    appendToLog([`🧍 Гравець завдає ${playerHit.defenseLoss + playerHit.healthLoss} шкоди.`]);

    if (afterEnemyHP <= 0) {
      appendToLog(["🎉 Перемога!"]);
      setBattleResult("win");
      return;
    }

    // ==== Ворог відповідає ====
    setTimeout(() => {
      if (!enemyStats) return;

      const enemyHit = calculateDamage(enemyStats.damage, playerDEF);
      const afterPlayerDEF = Math.max(playerDEF - enemyHit.defenseLoss, 0);
      const afterPlayerHP = Math.max(playerHP - enemyHit.healthLoss, 0);

      setPlayerDEF(afterPlayerDEF);
      setPlayerHP(afterPlayerHP);
      appendToLog([`👾 Ворог завдає ${enemyHit.defenseLoss + enemyHit.healthLoss} шкоди.`]);

      if (afterPlayerHP <= 0) {
        appendToLog(["💀 Поразка!"]);
        setBattleResult("lose");
        return;
      }
      setCanAttack(true);
    }, 500);
  };

  useEffect(() => {
  if (showPreBattle && playerLevel) {
    const generated = generateSequentialEnemy(encounterNumber, playerLevel);
    setEnemyStats(generated);
    setEnemyImage(generated.image);
    setEnemyHP(generated.maxHealth);
    setEnemyDEF(generated.defense);
    setTurnTimer(15);
    setIsHit(false);
    setCanAttack(false); // Дозволити напад тільки після "Почати бій"
  }
  }, [showPreBattle, playerLevel, encounterNumber]);

  useEffect(() => {
    fetchInventory();
  }, [userId]);

  useEffect(() => {
    const stats = getPlayerStats(inventory);
    setPlayerStats(stats);
    setPlayerHP(stats.health);
    setPlayerDEF(stats.defense);
    if (enemyStats) {
      setEnemyHP(enemyStats.currentHealth);
      setEnemyDEF(enemyStats.defense);
    }
    setIsLoading(false);
    setCanAttack(true);
  }, [inventory]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function calculateReward(enemy: Enemy | null): { rewardPoints: number; rewardExp: number } {
    if (!enemy) return { rewardPoints: 0, rewardExp: 0 };

    const base = baseEnemies.find((e: EnemyBase) => e.name === enemy.name);
    if (!base) return { rewardPoints: 0, rewardExp: 0 };

    const baseValue = base.baseHealth + base.baseDamage + base.baseDefense;
    const scaleFactor = enemy.maxHealth / base.baseHealth;

    const rewardPoints = Math.floor(baseValue * 1 * scaleFactor);
    const rewardExp = Math.floor(baseValue * 0.5 * scaleFactor);

    return { rewardPoints, rewardExp };
  }

  if (showPreBattle) {
    return (
      <Page>
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
          <Card
            className="page"
            style={{
              position: "fixed",
              top: 0,
              left: 1,
              width: "100vw",
              height: "100vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              color: "#fff",
              padding: "16px", // трохи внутрішнього відступу
              boxSizing: "border-box",
            }}
          >
            <h2 
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
              }}
            >
              ⚔️ Ви натрапили на ворога ! ⚔️</h2>

            <h1 style={{ animation: "fadeIn 3s ease forwards",marginBottom:20, }}>{enemyStats?.name}</h1>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "40px",
                color: "#fff",
                animation: "fadeIn 3s ease forwards",
                marginBottom: "0px"
              }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                  <span>{enemyHP} </span>
                  <span>❤️ </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                  <span>🗡️ </span>
                  <span>{enemyStats?.damage} </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>            
                  <span>🛡️</span>
                  <span>{enemyDEF} </span>
                </div>
            </div>
            <img
              src={enemyImage}
              style={{
                marginTop: "50px",
                marginBottom: "30px",
                width: "100px",
                display: "flex",
                alignItems: "center",
                animation: "fadeIn 0.6s ease forwards",
              }}
            />

            <h2
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "40px",
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
              }}
            > 
              Ваші характеристики :</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "40px",
                marginBottom: "30px",
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
              }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                <span>{playerHP} </span>
                <span>❤️ </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                  <span>🗡️ </span>
                  <span>{playerStats.attack} </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>            
                  <span>🛡️</span>
                  <span>{playerDEF} </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                <span>⚡</span>
                <span>{energy}</span>
                </div>
            </div>

            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#4caf50",
                animation: "fadeIn 0.6s ease forwards",
              }}>
              <Button
                onClick={() => {
                  setShowPreBattle(false);
                  setCanAttack(true);
                }}
              >
               ⚔️ Почати бій ⚔️
              </Button>
            </div>

            <Link href="/home">
              <Button style={{ animation: "fadeIn 0.6s ease forwards",marginTop: 12, marginBottom: -20, backgroundColor:"#f44336" }}>
                Втекти
              </Button>
            </Link>
          </Card>
      </Page>
    );
  }
  
  return (
    <Page back >
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Placeholder>
      <div
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeIn 1s ease forwards",
        }}
      > 
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%", // або більше/менше залежно від дизайну
            backgroundImage: "url('/bg/bgforestnght1.jpg')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginTop: "0px",
            marginBottom: "0px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{
            position: "absolute",
            width: "100%",
            top: 0,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginTop: "0px",
            marginBottom: "0px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}>
            <ProgressBar value={turnTimer} max={15} color="#fbbf24" />
          </div>
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "40px",
              color: "#fff",
              bottom: 70,
              animation: "fadeIn 0.6s ease forwards",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              paddingInline: "100%",
            }}
            >
              <h3 style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
            }}> {enemyStats?.name}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
              <span>❤️ </span>
              <span>{enemyHP} </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                <span>🗡️ </span>
                <span>{enemyStats?.damage} </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>            
                <span>🛡️</span>
                <span>{enemyDEF} </span>
              </div>
          </div>
          <div style={{
                position: "absolute",
                bottom: 120,
              }}>
            <ProgressBar value={enemyHP} max={enemyStats ? enemyStats.currentHealth : 1} color="#f44336" />  
            <img
              src={enemyImage}
              alt={enemyStats?.name}
              style={{
                marginLeft: 0,
                marginTop: 10,
                marginBottom: 16,
                width: "140px",
                height: "140px",
                objectFit: "contain",
                animation: isHit ? "hitFlash 0.3s ease" : undefined,
                cursor: canAttack && !battleResult ? "pointer" : "default",
                transition: "transform 0.2s ease",
              }}
              onClick={() => {
                if (canAttack && !battleResult) {
                  setIsHit(true);
                  handleAttack();
                  setIsEnemyHit(true);
                  setTimeout(() => setIsEnemyHit(false), 200);
                  setTimeout(() => setIsHit(false), 200);
                }
              }}
            />
            {hitText && (
              <div
                key={hitText.id}
                style={{
                  position: "absolute",
                  top: -30,
                  left: "60%",
                  transform: "translateX(-50%)",
                  fontSize: "20px",
                  color: "#ff4747",
                  animation: "hit-float 1s ease-out forwards",
                  pointerEvents: "none",
                  fontWeight: "bold"
                }}
              >
                - {hitText.value}
              </div>
            )}
          </div>
          
          <div style={{
            position: "absolute",
            width: "100%",
            bottom: 0,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginTop: "0px",
            marginBottom: "0px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}>
            <div style={{
            position: "absolute",
            width: "100%",
            top: 0,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginTop: "0px",
            marginBottom: "0px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}>
            <ProgressBar value={playerHP} max={playerStats.health} color="rgba(60, 255, 0, 0.73)" />
            </div>
            <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: "0px",
              marginBottom:10,
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
              
            }}
            > 
              <h2 style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 20,
              marginBottom:5,
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards",
              
            }}> Ваші характеристики :</h2>
              <div
                  style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "50px",
                  marginTop: "0px",
                  marginBottom:0,
                  color: "#fff",
                  animation: "fadeIn 0.6s ease forwards",
                }}
                > 
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                <span>❤️ </span>
                <span>{playerHP} </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>
                  <span>🗡️ </span>
                  <span>{playerStats.attack} </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "50%" }}>            
                  <span>🛡️</span>
                  <span>{playerDEF} </span>
                </div>
              </div>
          </div>
          </div>
        </div>
      </div>
      </Placeholder>
      <Card>
          {battleResult && (
            <div
              style={{
                position: "fixed",
                top: 0, left: 0, width: "100%", height: "100%",
                backgroundColor: "rgba(0,0,0,0.95)",
                display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center",
                color: "#fff", zIndex: 9999,
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="battleResultTitle"
            >
              <h2
                id="battleResultTitle"
                style={{
                  fontSize: 40,
                  marginTop: 20,
                  marginBottom: 32,
                  color: "#fffc",
                }}
              >
                {battleResult === "win" ? "🎊" : "💀"}
              </h2>
              <h2 style={{ fontSize: 40, margin: 0, marginBottom: 40 }}>
                {battleResult === "win" ? "Перемога!" : "Поразка!"}
              </h2>
              <p style={{ fontSize: 16, margin: 0, marginBottom: 40 }}>
                {battleResult === "win"
                  ? "✨ Вам зараховано винагороду! ✨"
                  : "Схоже, не пощастило цього разу..."}
              </p>

              <Button
                onClick={() => setShowLog(prev => !prev)}
                style={{
                  marginBottom: 25,
                  backgroundColor: "transparent",
                  border: "1px solid #fff",
                  borderRadius: 8,
                  color: "#fff",
                }}
                aria-label={showLog ? "Сховати лог бою" : "Показати лог бою"}
              >
                📜 {showLog ? "Сховати лог бою" : "Переглянути лог бою"}
              </Button>

              {battleResult === "win" && (
                <Button
                  mode="filled"
                  style={{
                    marginBottom: 20,
                    animation: "fadeIn 0.6s ease forwards",
                    backgroundColor: "#4caf50",
                    color: "#fff"
                  }}
                  aria-label="Наступний ворог"
                  onClick={() => {
                    setEncounterNumber(prev => prev + 1);
                    setPlayerHP(playerStats.health);
                    setPlayerDEF(playerStats.defense);
                    setBattleResult(null);
                    setLog([]);
                    setShowLog(false);
                    setTurnTimer(15);
                    setShowPreBattle(true); // екран підготовки нового бою
                  }}
                >
                  ⚔️ Наступний ворог ⚔️
                </Button>
              )}

              <Link href="/home">
                <Button
                  style={{
                    marginBottom: 10,
                    backgroundColor: "#f44336",
                    color: "#fff",
                    animation: "fadeIn 0.6s ease forwards",
                  }}
                  aria-label="Втекти додому"
                >
                  Втекти
                </Button>
              </Link>

              {showLog && (
                <div
                  style={{
                    marginTop: 20,
                    maxHeight: 200,
                    overflowY: "auto",
                    padding: 12,
                    border: "1px solid #fff",
                    borderRadius: 8,
                    backgroundColor: "#111",
                    width: "90%",
                    color: "#fff",
                  }}
                  aria-label="Журнал бою"
                >
                  {log.length === 0
                    ? <div style={{ opacity: 0.6 }}>Лог ще порожній</div>
                    : log.map((entry, idx) => (
                      <div key={idx}>{entry}</div>
                    ))}
                </div>
              )}
            </div>
          )}
        </Card>
    </Page>
  );
}