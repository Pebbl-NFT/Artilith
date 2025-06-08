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

  const [playerStats, setPlayerStats] = useState({ health: 10, attack: 0, defense: 0 });
  const [playerHP, setPlayerHP] = useState(10);
  const [playerDEF, setPlayerDEF] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [inventory, setInventory] = useState<any[]>([]);
  const [energy, setEnergy] = useState(0);
  const hasShownToast = useRef(false);

  const [points, setPoints] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1); // за замовчуванням рівень 1
  const [experience, setExperience] = useState(0);

  const [enemyStats, setEnemyStats] = useState<Enemy | null>(null);
  const [enemyHP, setEnemyHP] = useState(0);
  const [enemyImage, setEnemyImage] = useState("");
  const [enemyDEF, setEnemyDEF] = useState(0);

  const [encounterNumber, setEncounterNumber] = useState(1); // Буде завантажено з БД
  // Додаткові стани для статистики (будуть завантажені та оновлені)
  const [maxEncounterNumber, setMaxEncounterNumber] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalLosses, setTotalLosses] = useState(0);
  const [minibossKills, setMinibossKills] = useState(0);
  const [bossKills, setBossKills] = useState(0);
  // const [currentBiome, setCurrentBiome] = useState('forest'); // Для майбутнього

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
    setIsLoading(true); // Починаємо завантаження
    const { data, error } = await supabase
      .from("users")
      .select("points, click_delay, energy, experience, level, current_encounter_number, max_encounter_number, total_wins, total_losses, miniboss_kills, boss_kills") // <--- НОВІ ПОЛЯ
      .eq("id", userId)
      .single();

      if (error) {
      console.error("Помилка завантаження даних користувача:", error);
      toast.error("Не вдалося завантажити дані користувача.");
      // Встановлюємо дефолтні значення, якщо користувач новий або сталася помилка
      setEncounterNumber(1);
      // setIsLoading(false); // Завершуємо завантаження тут у разі помилки
    } else if (data) {
      setPoints(data.points || 0);
      setEnergy(data.energy || 0);
      setPlayerLevel(data.level || 1);
      setExperience(data.experience || 0);
      setEncounterNumber(data.current_encounter_number || 1); // <--- ЗАВАНТАЖУЄМО
      setMaxEncounterNumber(data.max_encounter_number || 0);
      setTotalWins(data.total_wins || 0);
      setTotalLosses(data.total_losses || 0);
      setMinibossKills(data.miniboss_kills || 0);
      setBossKills(data.boss_kills || 0);
      if (data.energy <= 0 && !hasShownToast.current) {
        toast.error("У вас закінчилася енергія ⚡");
        hasShownToast.current = true;
      }
    }
    // setIsLoading(false); // Завершуємо завантаження після успішного отримання даних або помилки
    // fetchInventory буде викликаний в своєму useEffect, який залежить від userId
    // setIsLoading буде встановлено в false в useEffect, що залежить від inventory
  };


  // Використовуйте fetchUserData у useEffect
  useEffect(() => {
      fetchUserData(); // Викликаємо функцію
  }, [userId]);

  const appendToLog = (newEntries: string[]) => {
    setLog(prev => {
      if (prev.some(line => line.includes("Перемога") || line.includes("Поразка"))) {
        return prev; // лог вже завершений
      }
      return [...newEntries, ...prev];
    });
  };

  useEffect(() => {
    if (inventory && inventory.length > 0) {
      // Оновлюємо характеристики гравця
      const stats = getPlayerStats(inventory);
      setPlayerStats(stats);

      // Встановлюємо HP та захист
      setPlayerHP(stats.health);
      setPlayerDEF(stats.defense);

      // Оновлюємо характеристики ворога, якщо доступні
      if (enemyStats) {
        setEnemyHP(enemyStats.currentHealth);
        setEnemyDEF(enemyStats.defense);
      }

      // Знімаємо стан завантаження після завершення
      setIsLoading(false);
      setCanAttack(true);
    }
  }, [inventory, enemyStats]); // Залежності: inventory і enemyStats
  
  const fetchInventory = async () => {
    if (!userId) return;
    // Вибираємо тільки ті поля, які потрібні для ідентифікації та статусу з таблиці інвентарю
    const { data, error } = await supabase
      .from("inventory")
      .select("item_id, equipped, id, upgrade_level") // damage/defense тут не потрібні, якщо вони базові і є в AllItems
      .eq("user_id", userId);

    if (error) {
      console.error("Помилка при завантаженні інвентаря:", error.message);
      setInventory([]);
      return;
    }
    if (!data) {
        setInventory([]);
        return;
    }

    const formatted = data.map((entry) => {
      const itemDetails = AllItems.find((i) => i.item_id === entry.item_id);

      if (!itemDetails) {
        console.warn(`Деталі для предмета з item_id ${entry.item_id} не знайдено в AllItems.`);
        return null;
      }

      // itemDetails вже має базові damage та defense
      return {
        ...itemDetails, // Розповсюджуємо всі властивості з AllItems, включаючи базові damage/defense
        id: entry.id, // ID запису в інвентарі
        equipped: entry.equipped, // Статус екіпірування
        upgrade_level: entry.upgrade_level ?? 0, // Рівень покращення
      };
    }).filter(item => item !== null);

    console.log("FETCHED AND FORMATTED INVENTORY:", JSON.stringify(formatted, null, 2));
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
        setPoints(newPoints);
        setExperience(newExperience); 
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
    if (showPreBattle && playerLevel && encounterNumber > 0 && userId) { // Переконуємось, що userId є
      console.log(`Generating enemy for encounter: ${encounterNumber}, player level: ${playerLevel}`);
      const generated = generateSequentialEnemy(encounterNumber, playerLevel);
      setEnemyStats(generated);
      setEnemyImage(generated.image);
      setEnemyHP(generated.maxHealth); // Встановлюємо максимальне здоров'я як поточне на початку
      setEnemyDEF(generated.defense);
      setTurnTimer(15); // Чи скільки у вас там
      setIsHit(false);
      // setCanAttack(false); // Атака стане доступною після натискання "Почати бій"
      setBattleResult(null); // Скидаємо результат попереднього бою
      setLog([]); // Очищаємо лог бою
    }
  }, [showPreBattle, playerLevel, encounterNumber, userId]); // Додали userId як залежність
  // useEffect для завантаження інвентаря
   useEffect(() => {
    if (userId) { // Переконуємось, що userId є перед завантаженням інвентаря
      fetchInventory();
    }
  }, [userId]);

    // useEffect для оновлення статів гравця та ворога
  // Цей useEffect має реагувати на зміни inventory (для статів гравця)
  // та enemyStats (для початкового встановлення HP/DEF ворога)
  useEffect(() => {
    // Оновлення статів гравця
    if (inventory.length > 0) { // Перевіряємо, чи інвентар не порожній
      const stats = getPlayerStats(inventory);
      setPlayerStats(stats);
      setPlayerHP(stats.health); // Встановлюємо HP гравця на максимум відповідно до статів
      setPlayerDEF(stats.defense);
    } else {
      // Якщо інвентар порожній, можна встановити базові стати гравця
      setPlayerStats({ health: 20, attack: 1, defense: 0 }); // Або інші дефолтні значення
      setPlayerHP(20);
      setPlayerDEF(0);
    }
    // Початкове встановлення HP/DEF ворога, коли enemyStats змінюється (новий ворог згенерований)
    // Це вже робиться в useEffect, що генерує ворога, тому тут це може бути зайвим або викликати конфлікти.
    // Якщо enemyStats?.currentHealth вже встановлено в generateSequentialEnemy, то тут не треба.
    // if (enemyStats) {
    //   setEnemyHP(enemyStats.maxHealth); // Завжди починаємо з повним здоров'ям для нового ворога
    //   setEnemyDEF(enemyStats.defense);
    // }
    // Якщо всі дані завантажені (гравець, інвентар, ворог), то знімаємо isLoading
    if (userId && inventory.length > 0 && enemyStats) {
         setIsLoading(false);
    } else if (userId && !enemyStats && showPreBattle) { // Якщо користувач є, але ворог ще не згенерований на preBattle
        setIsLoading(false); // Можна теж зняти завантаження, щоб показати кнопку "Почати бій"
    }
    // setCanAttack(true); // Це має контролюватися кнопкою "Почати бій" та станом бою
  }, [inventory, userId]); // Залежність від inventory. enemyStats обробляється в іншому місці.

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

   // Функція для обробки завершення бою (перемога або поразка)
  const handleBattleEnd = async (win: boolean) => {
    if (!enemyStats) return;
    const { rewardPoints, rewardExp, droppedItems } = win ? calculateReward(enemyStats, playerLevel) : { rewardPoints: 0, rewardExp: 0, droppedItems: [] };
    // Оновлюємо статистику та дані користувача в Supabase
    await updateUserDataAfterBattle(rewardPoints, rewardExp, win, enemyStats.type);
    if (win) {
      toast.success(`Перемога! +${rewardPoints} 🪨, +${rewardExp} 🔷`);
      if (droppedItems.length > 0) {
        droppedItems.forEach(item => {
          // Тут логіка додавання предмета гравцю, наприклад, в іншу таблицю або оновлення JSONB поля
          toast.success(`Знайдено предмет: ${item.name}!`);
          // await addItemsToInventorySupabase(userId, [item]); // Приклад
        });
      }
      // Перехід до наступного етапу
      setEncounterNumber(prev => prev + 1);
    } else {
      toast.error("Поразка...");
      // Гравець залишається на тому ж етапі або інша логіка поразки
    }
    // Скидання стану для наступного бою
    setShowPreBattle(true); // Показати екран перед боєм для наступного ворога
    setBattleResult(null); // Скинути результат бою
    // setCanAttack(false); // Атака буде доступна після "Почати бій"
    // setIsLoading(true); // Можна встановити, поки генерується новий ворог
  };
  // useEffect для обробки результату бою
  useEffect(() => {
    if (battleResult === "win") {
      handleBattleEnd(true);
      clearInterval(timerRef.current!); // Зупиняємо таймер ходу
    } else if (battleResult === "lose") {
      handleBattleEnd(false);
      clearInterval(timerRef.current!); // Зупиняємо таймер ходу
    }
  }, [battleResult]); // Залежність тільки від battleResult
  // Оновлена функція updateRewardInSupabase (перейменовано та розширено)
  async function updateUserDataAfterBattle(
    rewardPoints: number,
    rewardExp: number,
    isWin: boolean,
    defeatedEnemyType: 'normal' | 'miniBoss' | 'boss'
  ) {
    if (!userId) return;
    // Поточні значення з state (вони вже мають бути актуальними після fetchUserData)
    const currentPoints = points;
    const currentExperience = experience;
    const currentLevel = playerLevel;
    // encounterNumber з state - це номер бою, щойно завершився
    const encounterJustFinished = encounterNumber;
    let newPoints = currentPoints + rewardPoints;
    let newExperience = currentExperience + rewardExp;
    let newLevel = currentLevel;
    while (newExperience >= getRequiredExp(newLevel)) {
      newExperience -= getRequiredExp(newLevel);
      newLevel++;
      toast.success(`Новий рівень: ${newLevel}!`);
    }
    const updatedStats = {
      points: newPoints,
      experience: newExperience,
      level: newLevel,
      total_wins: totalWins + (isWin ? 1 : 0),
      total_losses: totalLosses + (!isWin ? 1 : 0),
      miniboss_kills: minibossKills + (isWin && defeatedEnemyType === 'miniBoss' ? 1 : 0),
      boss_kills: bossKills + (isWin && defeatedEnemyType === 'boss' ? 1 : 0),
      current_encounter_number: isWin ? encounterJustFinished + 1 : encounterJustFinished, // Наступний етап при перемозі
      max_encounter_number: Math.max(maxEncounterNumber, isWin ? encounterJustFinished : 0), // Оновлюємо макс. етап при перемозі
    };
    const { error } = await supabase
      .from("users")
      .update(updatedStats)
      .eq("id", userId);
    if (error) {
      console.error("Помилка оновлення даних користувача після бою:", error.message);
      toast.error("Не вдалося зберегти прогрес.");
    } else {
      console.log("Дані користувача успішно оновлено після бою.");
      // Оновлюємо локальний state цими ж значеннями
      setPoints(updatedStats.points);
      setExperience(updatedStats.experience);
      setPlayerLevel(updatedStats.level);
      setTotalWins(updatedStats.total_wins);
      setTotalLosses(updatedStats.total_losses);
      setMinibossKills(updatedStats.miniboss_kills);
      setBossKills(updatedStats.boss_kills);
      // setEncounterNumber оновиться через handleBattleEnd -> setEncounterNumber(prev + 1)
      setMaxEncounterNumber(updatedStats.max_encounter_number);
    }
  }

  // handleStartBattle: коли гравець натискає кнопку "Почати бій"
  const handleStartBattle = async () => {
    if (!userId) {
      toast.error("Користувач не авторизований");
      return;
    }
    if (energy < 1) { // Вартість бою, наприклад, 1 енергія
      toast.error("Недостатньо енергії ⚡");
      return;
    }
    const energyCost = 1; // Вартість бою
    const success = await reduceEnergy(userId, energyCost); // reduceEnergy має повертати true/false
    if (success) {
      setEnergy(prev => prev - energyCost);
      // toast.success(`Використано ${energyCost}⚡`); // Можна прибрати, якщо reduceEnergy вже показує
      setShowPreBattle(false); // Ховаємо екран перед боєм, починається сам бій
      setCanAttack(true);      // Дозволяємо атаку
      setLog([`Бій розпочато! Етап: ${encounterNumber}`]); // Початковий запис в лог
      startTurnTimer();      // Запускаємо таймер ходу гравця
    } else {
      toast.error("Помилка списання енергії. Спробуйте пізніше.");
    }
  };

   // Оновлена функція calculateReward
  // Предмети поки що просто як імена для прикладу
  const itemPlaceholders = {
    common: [{name: "Старий сувій", id: "scroll"}],
    miniBoss: [{ name: "Есенція мінібоса", id: "essence_miniboss" }, { name: "Рідкісний кристал", id: "crystal_rare"}],
    boss: [{ name: "Серце Боса", id: "heart_boss" }, {name: "Легендарний артефакт", id: "artifact_legendary"}],
  };
  function calculateReward(enemy: Enemy, pLevel: number): { rewardPoints: number; rewardExp: number; droppedItems: {name: string, id: string}[] } {
    if (!enemy) return { rewardPoints: 0, rewardExp: 0, droppedItems: [] };
    // Знаходимо базового ворога для отримання базових значень, якщо потрібно
    // Але оскільки enemy вже має тип, можна просто базувати нагороди на його характеристиках і типі
    const baseValue = enemy.maxHealth + enemy.damage * 5 + enemy.defense * 3; // Приклад формули базової цінності
    let rewardPoints = Math.floor(baseValue * 0.1);
    let rewardExp = Math.floor(baseValue * 0.05);
    // Бонус за рівень гравця (наприклад, +2% до нагород за кожен рівень гравця)
    const playerLevelBonus = 1 + (pLevel - 1) * 0.02;
    rewardPoints = Math.floor(rewardPoints * playerLevelBonus);
    rewardExp = Math.floor(rewardExp * playerLevelBonus);
    let droppedItems: {name: string, id: string}[] = [];
    const randomChance = Math.random(); // 0.0 to < 1.0
    switch (enemy.type) {
      case 'miniBoss':
        rewardPoints = Math.floor(rewardPoints * 1.8); // Більше очок за мінібоса
        rewardExp = Math.floor(rewardExp * 1.8);
        if (randomChance < 0.3) { // 30% шанс на предмет мінібоса
          droppedItems.push(itemPlaceholders.miniBoss[Math.floor(Math.random() * itemPlaceholders.miniBoss.length)]);
        }
        break;
      case 'boss':
        rewardPoints = Math.floor(rewardPoints * 3.5); // Значно більше за боса
        rewardExp = Math.floor(rewardExp * 3.5);
        if (randomChance < 0.75) { // 75% шанс на предмет боса
           droppedItems.push(itemPlaceholders.boss[Math.floor(Math.random() * itemPlaceholders.boss.length)]);
        }
        // Можна гарантовано давати унікальний предмет за першу перемогу над босом (потребує дод. логіки/поля в БД)
        break;
      case 'normal':
      default:
        if (randomChance < 0.08) { // 8% шанс на звичайний предмет
          droppedItems.push(itemPlaceholders.common[Math.floor(Math.random() * itemPlaceholders.common.length)]);
        }
        break;
    }
    return { rewardPoints, rewardExp, droppedItems };
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

            <h1 style={{ animation: "fadeIn 3s ease forwards",marginBottom:30, }}>{enemyStats?.name}</h1>
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
                gap: "30px",
                marginBottom: "30px",
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards",
                fontSize: 15,
              }}
            >
              {/* Відображення характеристик */}
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
                position:"absolute",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                animation: "fadeIn 0.6s ease forwards",
                bottom: "25px",
                gap:"20px",
                width: "100%",
            }}>
              <Link href="/home">
                <Button style={{ animation: "fadeIn 0.6s ease forwards",backgroundColor:"#f44336" }}>
                  Втекти
                </Button>
              </Link>
              <Button
                  style={{ animation: "fadeIn 0.6s ease forwards", backgroundColor:"#4caf50" }}
                  // Переміщуємо обробник handleStartBattle сюди
                  // Видаляємо старий обробник () => { setShowPreBattle(false); setCanAttack(true); }
                  onClick={handleStartBattle}
              >
              ⚔️ Почати бій ⚔️
              </Button>
            </div>
          </Card>
      </Page>
    );
  }
  
  return (
    <Page back >
      <Placeholder>
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
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
            height: "90%", // або більше/менше залежно від дизайну
            backgroundImage: "url('/bg/bgforestnght1.jpg')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            top: "0px",
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
                marginBottom: 5,
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
            fontSize: 14,
          }}> 
            {enemyStats?.name}
          </h3>

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
        <div 
          style={{
            position: "absolute",
            width: "100%",
            bottom: 0,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
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
            > <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
              <h2
                id="battleResultTitle"
                style={{
                  fontSize: 40,
                  marginTop: -20,
                  marginBottom: 32,
                  color: "#fffc",
                }}
              >
                {battleResult === "win" ? "🎊" : "💀"}
              </h2>
              <h2 style={{ fontSize: 40, margin: 0, marginBottom: 40 }}>
                {battleResult === "win" ? "Перемога!" : "Поразка!"}
              </h2>
              <p style={{ fontSize: 12, margin: 0, marginBottom: 40 }}>
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

              <div style={{
                  position:"absolute",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  animation: "fadeIn 0.6s ease forwards",
                  bottom: "0px",
                  paddingBottom: 20,
                  paddingTop: 20,
                  gap:"20px",
                  width: "100%",
                  backgroundColor: "rgba(0, 0, 0, 0.64)",
              }}>
                <Link href="/home">
                  <Button
                    style={{
                      backgroundColor: "#f44336",
                      color: "#fff",
                      animation: "fadeIn 0.6s ease forwards",
                    }}
                    aria-label="Втекти додому"
                  >
                    Втекти
                  </Button>
                </Link>

                {battleResult === "win" && (
                  
                  <Button
                    mode="filled"
                    style={{
                      animation: "fadeIn 0.6s ease forwards",
                      backgroundColor: "#4caf50",
                      color: "#fff"
                    }}
                    aria-label="Далі"
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
                    ⚔️ Далі ⚔️
                  </Button>
                )}
              </div>

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