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
import {addInventoryItem} from "@/hooks/useItemActions";
import { ScrollItems } from "@/components/Item/ScrollItem";

interface DroppedItemInfo {
  item_id: number; 
  name: string;
  // image?: string; // опціонально, якщо потрібно для сповіщень
}

function mapToDroppedItemInfo(item: { item_id: number; name: string; [key: string]: any }): DroppedItemInfo {
  return {
    item_id: item.item_id,
    name: item.name,
  };
}

const effectiveCommonDrops: DroppedItemInfo[] = AllItems
  .filter(item => item.rarity === 'common')
.map(mapToDroppedItemInfo);

const effectiveMiniBossDrops: DroppedItemInfo[] = AllItems
  .filter(item =>
    item.rarity === 'uncommon' ||
    item.type === 'scroll' // Додаємо всі сувої до дропу міні-босів
  )
.map(mapToDroppedItemInfo);

const effectiveBossDrops: DroppedItemInfo[] = AllItems
  .filter(item =>
    item.rarity === 'rare' ||
    ((item.type === 'weapon' || item.type === 'shield') && item.rarity === 'uncommon')
  )
.map(mapToDroppedItemInfo);

// Додатково: якщо ви хочете, щоб певний предмет (наприклад, "Старий сувій")
// гарантовано був у певних пулах або мав особливі умови:
const specificScroll = AllItems.find(item => item.name === "Старий сувій");
if (specificScroll) {
  const scrollForDrop = mapToDroppedItemInfo(specificScroll);
  // Приклад: додати до common дропу, якщо його там ще немає
  if (!effectiveCommonDrops.find(i => i.item_id === scrollForDrop.item_id)) {
    effectiveCommonDrops.push(scrollForDrop);
  }
  // Можна додати і до інших пулів за потреби
}

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
  const hasProcessedOutcome = useRef(false);

  // Завантажуємо дані користувача із Supabase
  const fetchUserData = async () => {
    if (!userId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("points, click_delay, energy, experience, level, current_encounter_number, max_encounter_number, total_wins, total_losses, miniboss_kills, boss_kills")
      .eq("id", userId)
      .single();
      if (error) {
      console.error("Помилка завантаження даних користувача:", error);
      toast.error("Не вдалося завантажити дані користувача.");
      setEncounterNumber(1);
    } else if (data) {
      setPoints(data.points || 0);
      setEnergy(data.energy || 0);
      setPlayerLevel(data.level || 1);
      setExperience(data.experience || 0);
      setEncounterNumber(data.current_encounter_number || 1);
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
     setIsLoading(false); // Переконайтеся, що setIsLoading(false) викликається
  };

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
      const stats = getPlayerStats(inventory);
      setPlayerStats(stats);
      setPlayerHP(stats.health);
      setPlayerDEF(stats.defense);
      setIsLoading(false);
    } else if (userId) { 
        setPlayerStats({ health: 20, attack: 1, defense: 0 });
        setPlayerHP(20);
        setPlayerDEF(0);
        // setIsLoading(false); // Можна зняти, якщо інвентар просто порожній, але fetchUserData ще може працювати
    }
  }, [inventory, userId]);
  
   const fetchInventory = async () => {
    if (!userId) return;
    // setIsLoading(true); // Можна встановити тут, якщо fetchUserData не робить цього для цього потоку
    const { data, error } = await supabase
      .from("inventory")
      .select("item_id, equipped, id, upgrade_level") 
      .eq("user_id", userId);
    if (error) {
      console.error("Помилка при завантаженні інвентаря:", error.message);
      setInventory([]);
      // setIsLoading(false);
      return;
    }
    if (!data) {
        setInventory([]);
        // setIsLoading(false);
        return;
    }
    const formatted = data.map((entry) => {
      // Припускаємо, що AllItems - це масив, що містить всі можливі предмети, включаючи ScrollItems
      const itemDetails = AllItems.find((i) => i.item_id === entry.item_id); 
      if (!itemDetails) {
        console.warn(`Деталі для предмета з item_id ${entry.item_id} не знайдено в AllItems.`);
        return null;
      }
      return {
        ...itemDetails, 
        id: entry.id, 
        equipped: entry.equipped, 
        upgrade_level: entry.upgrade_level ?? 0, 
      };
    }).filter(item => item !== null);
    setInventory(formatted);
    // setIsLoading(false); // Знімаємо завантаження після успішного оновлення інвентаря
  };

  useEffect(() => {
      fetchUserData(); // Викликаємо функцію
      fetchInventory();
  }, [userId]);

  function calculateDamage(attack: number, defense: number): { defenseLoss: number; healthLoss: number } {
    const rawDamage = Math.max(attack, 0);
    if (defense >= rawDamage) {
      return { defenseLoss: rawDamage, healthLoss: 0 };
    } else {
      return { defenseLoss: defense, healthLoss: rawDamage - defense };
    }
  }

  const startTurnTimer = () => {
    if (battleResult) return; 
    setTurnTimer(15); 
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!); 
          handleMissedTurn(); 
          return 0; 
        }
        return prev - 1; 
      });
    }, 600); 
  };

  const handleMissedTurn = () => {
    if (battleResult || !enemyStats) return; 
    clearInterval(timerRef.current!); 
    toast.error("Ви пропустили свій хід! Поразка."); 
    appendToLog(["⏱️ Ви пропустили хід! Гра завершена поразкою."]); 
    setBattleResult("lose"); 
  };

  // Функція для розрахунку досвіду
  const getRequiredExp = (level: number): number => {
      return 100 * Math.pow(2, level - 1); // 1 рівень = 100 XP, 2 рівень = 200, 3 рівень = 400 і т.д.
  };

  const handleAttack = () => {
    if (!enemyStats) return;
    if (!canAttack || playerHP <= 0 || enemyHP <= 0 || battleResult) return;
    
    if (timerRef.current) clearInterval(timerRef.current); 
    setCanAttack(false);
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
    setTimeout(() => {
      if (!enemyStats || battleResult) return; 
      
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
      startTurnTimer(); 
    }, 500);
  };

  useEffect(() => {
  if (showPreBattle && playerLevel && encounterNumber > 0 && userId) {
            console.log(`Generating enemy for encounter: ${encounterNumber}, player level: ${playerLevel}`);
            const generated = generateSequentialEnemy(encounterNumber, playerLevel);
            setEnemyStats(generated);
            setEnemyImage(generated.image);
            setEnemyHP(generated.maxHealth);
            setEnemyDEF(generated.defense);
            setTurnTimer(15);
            setIsHit(false);
            // *** ВАЖЛИВО: скидаємо результат бою при підготовці до нового ***
            setBattleResult(null); 
            // Скидаємо прапор обробки, готуючись до наступного бою
            hasProcessedOutcome.current = false;
            setLog([]);
        }
    }, [showPreBattle, playerLevel, encounterNumber, userId]);
    useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; 
  }, []);

  // useEffect для оновлення статів гравця та ворога
  // Цей useEffect має реагувати на зміни inventory (для статів гравця)
  // та enemyStats (для початкового встановлення HP/DEF ворога)
   useEffect(() => {
    if (inventory.length > 0) { 
      const stats = getPlayerStats(inventory);
      setPlayerStats(stats);
      // Встановлюємо HP/DEF тільки якщо вони ще не встановлені або скинуті
      if (playerHP <= 0 || playerStats.health !== stats.health ) setPlayerHP(stats.health); 
      if (playerDEF < 0 || playerStats.defense !== stats.defense ) setPlayerDEF(stats.defense); // Можливо, не потрібне оновлення DEF тут постійно
    } else {
      setPlayerStats({ health: 20, attack: 1, defense: 0 }); 
      if (playerHP <= 0) setPlayerHP(20); // Відновлення HP якщо гравець "мертвий" і без предметів
      if (playerDEF < 0) setPlayerDEF(0);
    }
    
    if (userId && (inventory.length > 0 || !showPreBattle) && (enemyStats || showPreBattle)) {
         setIsLoading(false);
    } else if (userId && !enemyStats && showPreBattle && inventory.length === 0) { 
        setIsLoading(false); 
    }
  }, [inventory, userId, enemyStats, showPreBattle, playerStats.health, playerStats.defense]); // Додані залежності

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

   // Функція для обробки результатів бою (збереження, нагороди)
  const processBattleOutcome = async (isWin: boolean) => {
    if (hasProcessedOutcome.current || !enemyStats || !userId) return;
    hasProcessedOutcome.current = true;
    clearInterval(timerRef.current!);
    const { rewardPoints, rewardExp, droppedItems } = isWin 
      ? calculateReward(enemyStats, playerLevel) 
      : { rewardPoints: 0, rewardExp: 0, droppedItems: [] };
    // Спочатку оновлюємо статистику бою (очки, досвід, рівень, тощо)
    await updateUserDataAfterBattle(rewardPoints, rewardExp, isWin, enemyStats.type);
    if (isWin) {
      toast.success(`Перемога! +${rewardPoints} 🪨, +${rewardExp} 🔷`);
      if (droppedItems.length > 0) {
        for (const item of droppedItems) {
          // Викликаємо функцію додавання предмета в інвентар
          const added = await addInventoryItem(String(userId), item.item_id, item.name);
          if (added) {
            toast.success(`Знайдено та додано: ${item.name}!`);
            // ОПЦІОНАЛЬНО: Оновити локальний стан інвентаря setInventory
            // Щоб негайно відобразити новий предмет, можна:
            // 1. Перезавантажити інвентар з БД: await fetchInventory(); (простіше, але може бути повільніше)
            // 2. Або додати предмет до локального стану setInventory (складніше, потрібно мати повні дані про предмет)
            // Для простоти, поки що можна покластися на те, що користувач побачить предмет при наступному візиті на сторінку інвентаря
            // або при наступному завантаженні fetchInventory().
            // Якщо ви хочете негайне оновлення, розгляньте варіант 1 або 2.
            // Для варіанту 1:
            await fetchInventory(); // Перезавантажуємо інвентар
          } else {
            // Можливо, предмет вже є, або сталася інша помилка в addInventoryItem (наприклад, дублікат, якщо у вас є обмеження)
            // addInventoryItem має повертати !error, тому "false" означає помилку.
            // Ваша функція addInventoryItem не перевіряє наявність предмета, тому це повідомлення може бути неточним.
            // Розгляньте можливість додати перевірку на дублікати в addInventoryItem, якщо це потрібно.
            toast.error(`Не вдалося додати ${item.name}. Можливо, він вже у вас є.`); 
          }
        }
      }
    } else {
      toast.error("Поразка...");
    }
    // UI для переходу далі контролюється кнопкою після бою
  };

  // useEffect для обробки результату бою
  useEffect(() => {
    // Переконуємося, що userId існує перед обробкою результату,
    // оскільки processBattleOutcome залежить від нього
    if (battleResult && userId && !hasProcessedOutcome.current) {
      if (battleResult === "win") {
        processBattleOutcome(true);
      } else if (battleResult === "lose") {
        processBattleOutcome(false);
      }
    }
  }, [battleResult, userId]); // Додано userId до залежностей

    async function updateUserDataAfterBattle(
      rewardPoints: number,
      rewardExp: number,
      isWin: boolean,
      defeatedEnemyType: 'normal' | 'miniBoss' | 'boss'
  ) {
    if (!userId) return;
    
    const encounterJustFinished = encounterNumber;
    const newEncounterNumber = isWin ? encounterJustFinished + 1 : 1; 
    const currentPoints = points; 
    const currentExperience = experience; 
    const currentLevel = playerLevel; 
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
      current_encounter_number: newEncounterNumber,
      max_encounter_number: Math.max(maxEncounterNumber, isWin ? encounterJustFinished : 0),
    };
    const { error } = await supabase.from("users").update(updatedStats).eq("id", userId);
    if (error) {
        console.error("Помилка оновлення даних:", error.message);
        toast.error("Не вдалося зберегти прогрес.");
    } else {
      setPoints(updatedStats.points);
      setExperience(updatedStats.experience);
      setPlayerLevel(updatedStats.level);
      setTotalWins(updatedStats.total_wins);
      setTotalLosses(updatedStats.total_losses);
      setMinibossKills(updatedStats.miniboss_kills);
      setBossKills(updatedStats.boss_kills);
      setEncounterNumber(updatedStats.current_encounter_number);
      setMaxEncounterNumber(updatedStats.max_encounter_number);
    }
  }

  // handleStartBattle: коли гравець натискає кнопку "Почати бій"
  const handleStartBattle = async () => {
    if (!userId) {
      toast.error("Користувач не авторизований");
      return;
    }
    // Перевірка, чи попередній бій повністю завершено (hasProcessedOutcome має бути true)
    // або якщо це перший бій (battleResult === null)
    if (battleResult !== null && !hasProcessedOutcome.current) {
        toast.error("Зачекайте, попередній бій ще обробляється.");
        return;
    }
    if (energy < 1) { 
      toast.error("Недостатньо енергії ⚡");
      return;
    }
    const energyCost = 1; 
    const success = await reduceEnergy(userId, energyCost); 
    if (success) {
      setEnergy(prev => prev - energyCost);
      // Скидання станів для нового бою
      hasProcessedOutcome.current = false; // Готовність до обробки наступного результату
      setBattleResult(null);             // Немає результату на початку бою
      setLog([`Бій розпочато! Етап: ${encounterNumber}`]); 
      setShowPreBattle(false); 
      setCanAttack(true);      
      startTurnTimer(); 
    } else {
      // reduceEnergy вже має показувати помилку
    }
  };

  function calculateReward(enemy: Enemy, pLevel: number): { rewardPoints: number; rewardExp: number; droppedItems: DroppedItemInfo[] } {
    if (!enemy) return { rewardPoints: 0, rewardExp: 0, droppedItems: [] };
    const baseValue = enemy.maxHealth + enemy.damage * 5 + enemy.defense * 3;   
    let rewardPoints = Math.floor(baseValue * 0.2); // Базова кількість очок, 20% від базового значення
    let rewardExp = Math.floor(baseValue * 0.1); // Базова кількість досвіду, 10% від базового значення
    const playerLevelBonus = 1 + (pLevel - 1) * 0.05; // Бонус за рівень гравця, 5% за кожен рівень вище 1
    rewardPoints = Math.floor(rewardPoints * playerLevelBonus);
    rewardExp = Math.floor(rewardExp * playerLevelBonus);
    let currentDroppedItems: DroppedItemInfo[] = []; // Використовуємо DroppedItemInfo
    const randomChance = Math.random(); 
    switch (enemy.type) {
      case 'miniBoss':
        rewardPoints = Math.floor(rewardPoints * 1.8);
        rewardExp = Math.floor(rewardExp * 1.8);
        if (randomChance < 0.4 && effectiveMiniBossDrops.length > 0) {   // 0.5 = 40% шанс випадіння
          currentDroppedItems.push(effectiveMiniBossDrops[Math.floor(Math.random() * effectiveMiniBossDrops.length)]);
        }
        break;
      case 'boss':
        rewardPoints = Math.floor(rewardPoints * 3.5);
        rewardExp = Math.floor(rewardExp * 3.5);
        if (randomChance < 0.9 && effectiveBossDrops.length > 0) {  // 0.9 = 90% шанс випадіння
           currentDroppedItems.push(effectiveBossDrops[Math.floor(Math.random() * effectiveBossDrops.length)]);
        }
        break;
      case 'normal':
      default:
        if (randomChance < 0.2 && effectiveCommonDrops.length > 0) { // 0.2 = 20% шансу випадіння
          currentDroppedItems.push(effectiveCommonDrops[Math.floor(Math.random() * effectiveCommonDrops.length)]);
        }
        break;
    }
    return { rewardPoints, rewardExp, droppedItems: currentDroppedItems };
  }

  // --- ФУНКЦІЇ ВІДОБРАЖЕННЯ UI ---
  // Відображення етапу (інтегровано)
  const renderStageInfo = () => {
    if (!enemyStats && !isLoading) return null; // Не відображати, якщо немає ворога і не завантажується
    if (isLoading && showPreBattle) return null; // Не показувати під час початкового завантаження перед боєм, якщо бажаєте
    let stageText = `Етап: ${encounterNumber}`;
    if (enemyStats?.type === 'miniBoss') {
      stageText += " (Мінібос)";
    } else if (enemyStats?.type === 'boss') {
      stageText += " (БОС)";
    }
    // Додано колір та забезпечено видимість, налаштуйте стиль за потреби
    return <div style={{ textAlign: 'center', margin: '10px auto 15px auto', fontWeight: 'bold', color: '#fff', fontSize:'0.9em', textShadow: '1px 1px 2px black' }}>{stageText}</div>;
  };

  // --- ОБРОБНИКИ КНОПОК ДЛЯ МОДАЛЬНОГО ВІКНА ---
  const handleWinNext = () => {
      // `encounterNumber` вже оновлено в `updateUserDataAfterBattle`.
      // Нам потрібно лише відновити гравця і перейти до екрану підготовки.
      setPlayerHP(playerStats.health);
      setPlayerDEF(playerStats.defense);
      setShowPreBattle(true); // Це запустить `useEffect` для генерації нового ворога
  };
  
  const handleLossRetry = () => {
      // `encounterNumber` вже скинуто на 1 в `updateUserDataAfterBattle`.
      setPlayerHP(playerStats.health);
      setPlayerDEF(playerStats.defense);
      setShowPreBattle(true); // Це запустить `useEffect` для генерації ворога 1-го етапу
  };

  if (isLoading) { // Використовуємо більш простий варіант завантаження
      return (
          <Page>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
                  Завантаження даних...
              </div>
          </Page>
      );
  }

  if (showPreBattle) {
    if (!enemyStats) {
          return (
              <Page>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
                      Генерація ворога...
                  </div>
              </Page>
          );
    }
    return (
      <Page>
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
          <Card
            className="page" // Переконайтеся, що ваш CSS для .page обробляє цей повноекранний вигляд
            style={{
              position: "fixed", // Або використовуйте flex-центрування на Page, якщо бажаєте
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              backgroundColor: "rgba(0, 0, 0, 0.95)", // Темніший фон
              color: "#fff",
              padding: "16px",
              boxSizing: "border-box",
              borderRadius: 0,
              overflowY: "auto", // На випадок, якщо вміст переповнюється
              backgroundImage: "url('/bg/bgforestnght.jpg')", // Переміщено у внутрішній div
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {renderStageInfo()} {/* Інформація про етап також на екрані перед боєм */}
            <h2
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                color: "#fff",
                animation: "fadeIn 0.6s ease forwards", // Визначте fadeIn, якщо не глобально
                marginTop: 5, // Скоригований відступ
                marginBottom: 15,
                fontSize: "0.8em"
              }}
            >
              ⚔️ Ви натрапили на ворога ! ⚔️</h2>
            <h1 style={{ animation: "fadeIn 1s ease forwards", marginBottom:20, fontSize: "1.6em", textAlign:"center" }}>{enemyStats?.name}</h1>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "30px", // Зменшений проміжок
                color: "#fff",
                animation: "fadeIn 1.5s ease forwards",
                marginBottom: "20px", // Скоригований відступ
                fontSize: "0.9em"
              }}
              >
                <div style={{ textAlign: "center" }}> ❤️ {enemyHP}</div>
                <div style={{ textAlign: "center" }}> 🗡️ {enemyStats?.damage}</div>
                <div style={{ textAlign: "center" }}> 🛡️ {enemyStats?.defense}</div> {/* Виправлено з enemyDEF */}
            </div>
            <img
              src={enemyImage}
              alt={enemyStats?.name}
              style={{
                marginTop: "10px", // Скоригований відступ
                marginBottom: "20px", // Скоригований відступ
                width: "120px", // Скоригований розмір
                height: "120px",
                objectFit: "contain",
                display: "block", // Переконайтеся, що це блок для автоматичних відступів, якщо потрібно
                animation: "fadeIn 0.6s ease forwards",
                borderRadius: "8px",
              }}
            />
            <h2
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "40px", // Це може бути занадто багато, якщо це просто заголовок
                color: "#fff",
                animation: "fadeIn 2s ease forwards",
                marginBottom: "10px", // Скориговано
                fontSize: "1.2em"
              }}
            >
              Ваші характеристики :</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center", // Було "space-around"
                alignItems: "center",
                gap: "25px", // Зменшений проміжок
                marginBottom: "30px",
                color: "#fff",
                animation: "fadeIn 2.5s ease forwards",
                fontSize: "0.9em",
                width: "100%", // Переконайтеся, що займає ширину для правильного центрування елементів
                maxWidth: "350px" // Максимальна ширина для рядка статистики
              }}
            >
              <div style={{ textAlign: "center" }}> ❤️ {playerHP}</div>
              <div style={{ textAlign: "center" }}> 🗡️ {playerStats.attack}</div>
              <div style={{ textAlign: "center" }}> 🛡️ {playerDEF}</div>
              <div style={{ textAlign: "center" }}> ⚡ {energy}</div>
            </div>
            <div style={{
                position:"absolute", // Залишено згідно з вашим макетом
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                animation: "fadeIn 3s ease forwards",
                bottom: "25px",
                left: 0, // Переконайтеся, що охоплює ширину для центрування
                right: 0, // Переконайтеся, що охоплює ширину для центрування
                gap:"20px",
                width: "100%", // Явна ширина
                padding: "0 20px", // Відступ для кнопок на маленьких екранах
                boxSizing: "border-box"
            }}>
              <Link href="/home" style={{flex: 1, maxWidth: '150px'}}> {/* Flex для розміру кнопок */}
              <div
                  style={{ animation: "fadeIn 0.6s ease forwards", maxWidth: '200px', backgroundColor:"#f44336", fontSize: "0.7em", padding: "10px 20px", textAlign: "center", borderRadius: "8px", cursor: canAttack && energy >= 1 ? "pointer" : "not-allowed", color: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", transition: "transform 0.2s ease" }}
              >
              Втекти
              </div>
              </Link>
              <div
                  style={{ animation: "fadeIn 0.6s ease forwards", maxWidth: '200px', backgroundColor:"#4caf50", fontSize: "0.7em", padding: "10px 20px", textAlign: "center", borderRadius: "8px", cursor: canAttack && energy >= 1 ? "pointer" : "not-allowed", color: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", transition: "transform 0.2s ease" }}
                  onClick={handleStartBattle}
              >
              ⚔️ Почати бій ⚔️
              </div>
            </div>
          </Card>
      </Page>
    );
  }
  
  // --- Екран бою ---
  return (
    <Page>
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
      <div 
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: "fadeIn 1s ease forwards", // Визначте fadeIn, якщо не глобально
          color: "#fff", // Колір тексту за замовчуванням для цього вигляду
          // justifyContent: "center", // Вміст позиціонується абсолютно/flex всередині
          // backgroundImage: "url('/bg/bgforestnght1.jpg')", // Переміщено у внутрішній div
          // backgroundRepeat: "no-repeat",
          // backgroundSize: "cover",
          // backgroundPosition: "center",
        }}
      >
        {/* Шар фонового зображення */}
        <div style={{
            position: "absolute",
            width: "100%",
            height: "100%", // Охоплює весь екран
            backgroundImage: "url('/bg/bgforestnght1.jpg')", // Ваш фон
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: -1 // За іншим вмістом
        }}></div>
        {/* Верхня секція: Таймер ходу + Інформація про етап */}
        <div style={{
            position: "absolute",
            width: "calc(100% - 40px)", // Адаптивна ширина
            maxWidth: "600px", // Максимальна ширина для смуги таймера
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10, // Над фоном
        }}>
            {/* ProgressBar таймера ходу - припускаючи, що це компонент, який у вас є */}
            {/* <ProgressBar value={turnTimer} max={15} color="#fbbf24" /> */}
            {/* Заміна простим div, якщо ProgressBar не стандартний */}
             <div style={{ backgroundColor: '#555', borderRadius: '4px', overflow: 'hidden', border: '1px solid #777' }}>
                <div style={{ width: `${(turnTimer / 15) * 100}%`, backgroundColor: '#fbbf24', height: '10px', transition: 'width 0.5s ease' }}></div>
            </div>
            {renderStageInfo()} {/* Інформація про етап відображається тут */}
        </div>
        {/* Зона ворога */}
        <div style={{
            position: "absolute", // Налаштуйте відповідно до потреб вашого макета
            top: "50%", // Залиште місце для таймера та інформації про етап
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 5,
        }}>
            {enemyStats && (
                <>
                    <div style={{marginBottom: '5px', fontSize: '1.2em', fontWeight: 'bold', textShadow: '1px 1px 2px black'}}>{enemyStats.name}</div>
                    {/* Смуга HP ворога - припускаючи компонент ProgressBar */}
                    {/* <ProgressBar value={enemyHP} max={enemyStats.maxHealth} color="#f44336" /> */}
                    <div style={{ width: '150px', backgroundColor: '#555', borderRadius: '4px', overflow: 'hidden', border: '1px solid #777', marginBottom: '5px' }}>
                        <div style={{ width: `${(enemyHP / enemyStats.maxHealth) * 100}%`, backgroundColor: '#f44336', height: '12px', transition: 'width 0.5s ease', textAlign:'center', fontSize:'10px', lineHeight:'12px' }}>
                            {enemyHP}/{enemyStats.maxHealth}
                        </div>
                    </div>
                    <img
                      src={enemyImage}
                      alt={enemyStats?.name}
                      style={{
                        // marginLeft: 0, // Центровано батьківським елементом
                        // marginTop: 10, // Обробляється батьківським проміжком/відступом
                        marginBottom: 5,
                        width: "140px",
                        height: "140px",
                        objectFit: "contain",
                        animation: isHit ? "hitFlash 0.3s ease" : undefined, // Визначте анімацію hitFlash
                        cursor: canAttack && !battleResult && playerHP > 0 ? "pointer" : "default",
                        transition: "transform 0.2s ease",
                        filter: playerHP <= 0 ? 'grayscale(100%)' : 'none' // Зробити сірим, якщо гравець переможений
                      }}
                      onClick={() => {
                        if (canAttack && !battleResult && playerHP > 0 && enemyHP > 0) {
                          setIsHit(true); // Візуальний відгук на ворога
                          handleAttack();
                          // setIsEnemyHit(true); // Якщо у вас є окрема анімація для удару по ворогу
                          // setTimeout(() => setIsEnemyHit(false), 200);
                          setTimeout(() => setIsHit(false), 300); // Тривалість hitFlash
                        }
                      }}
                    />
                    {hitText && ( // Анімація тексту шкоди
                      <div
                        key={hitText.id} // Ключ React для скидання анімації
                        style={{
                          position: "absolute", // Відносно контейнера зображення ворога або цього div
                          top: "40%", // Налаштуйте для найкращого розміщення
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: "24px",
                          color: "#ff4747",
                          fontWeight: "bold",
                          animation: "hit-float 1s ease-out forwards", // Визначте анімацію hit-float
                          pointerEvents: "none",
                          textShadow: '1px 1px 1px black'
                        }}
                      >
                        - {hitText.value}
                      </div>
                    )}
                    {/* Відображення статистики ворога під зображенням */}
                    <div style={{ display: 'flex', gap: '15px', marginTop: '5px', fontSize: '0.9em', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px' }}>
                        <span>❤️ {enemyHP} / {enemyStats.maxHealth}</span>
                        <span>🗡️ {enemyStats.damage}</span>
                        <span>🛡️ {enemyDEF}</span>
                    </div>
                </>
            )}
        </div>
        {/* Зона гравця та елементи керування - внизу */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.6)", // Напівпрозорий фон для інформації про гравця
            paddingTop: "5px", // Простір для смуги HP
            zIndex: 10,
          }}>
            {/* Смуга HP гравця у самому верху цієї нижньої секції */}
            {playerStats && (
                 <div style={{ width: '80%', maxWidth:'400px', backgroundColor: '#555', borderRadius: '4px', overflow: 'hidden', border: '1px solid #777', marginBottom: '5px' }}>
                    <div style={{ width: `${(playerHP / playerStats.health) * 100}%`, backgroundColor: 'rgba(60, 255, 0, 0.73)', height: '12px', transition: 'width 0.5s ease', textAlign:'center', fontSize:'10px', lineHeight:'12px'  }}>
                        {playerHP}/{playerStats.health}
                    </div>
                </div>
            )}
            <div
            style={{
              display: "flex",
              flexDirection: "column", // Розмістити заголовок та статистику стовпцем
              justifyContent: "center",
              alignItems: "center",
              gap: "5px", // Зменшений проміжок
              // marginTop: "0px", // Видалено
              marginBottom:10,
              color: "#fff",
              animation: "fadeIn 0.6s ease forwards", // Визначте fadeIn
            }}
            >
              <h2 style={{
                  marginTop: 5, // Зменшений відступ
                  marginBottom:5,
                  fontSize: "1.2em", // Скоригований розмір
                  // animation: "fadeIn 0.6s ease forwards", // Вже на батьківському елементі
              }}> Ваші характеристики :</h2>
              <div
                  style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "20px", // Зменшений проміжок
                  // marginTop: "0px", // Видалено
                  // marginBottom:0, // Видалено
                  // animation: "fadeIn 0.6s ease forwards", // Вже на батьківському елементі
                  fontSize: "1em" // Скоригований розмір
                }}
                >
                {/* Статистика гравця */}
                <span>❤️ {playerHP}</span>
                <span>🗡️ {playerStats.attack}</span>
                <span>🛡️ {playerDEF}</span>
              </div>
            </div>
             {/* Кнопка Показати/Сховати лог - розміщена тут для кращого UX під час бою */}
            <Button
                size="s"
                mode="outline" // Або відповідний режим
                style={{marginTop: '5px', marginBottom: '10px', borderColor: '#888', color: '#ccc'}}
                onClick={() => setShowLog(!showLog)}
                disabled={battleResult !== null} // Вимкнути, якщо бій закінчився
            >
                {showLog ? "Сховати лог" : "Показати лог"}
            </Button>
        </div>
        {/* Лог бою - з'являється над елементами керування гравця, коли активний */}
        {showLog && !battleResult && ( // Показувати лог під час бою, лише якщо не в модальному вікні результатів
            <Card style={{
                position: 'absolute',
                bottom: '140px', // Налаштуйте, щоб було над елементами керування гравця
                width: 'calc(100% - 40px)',
                maxWidth: '500px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxHeight: '100px', // Зменшена висота
                overflowY: 'auto',
                padding: '8px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                border: '1px solid #444',
                borderRadius: '5px',
                fontSize: '0.8em',
                zIndex: 15
            }}>
                {log.length === 0 ? <div>Лог порожній.</div> :
                 log.map((entry, index) => <div key={index} style={{borderBottom: '1px dashed #333', paddingBottom: '2px', marginBottom: '2px'}}>{entry}</div>)}
            </Card>
        )}
      </div>

        {battleResult && (
        <div // Повноекранне накладення для модального вікна
            style={{
            position: "fixed",
            top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.96)", // Темніше накладення
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            color: "#fff", zIndex: 9999, // Переконайтеся, що воно зверху
            padding: "20px",
            boxSizing: "border-box"
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="battleResultTitle"
        >
            <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
            <h2
            id="battleResultTitle"
            style={{
                fontSize: "3em", // Більший емодзі
                marginTop: 0, // Скоригований відступ
                marginBottom: 20, // Скоригований відступ
                color: "#fffc",
            }}
            >
            {battleResult === "win" ? "🎊" : "💀"}
            </h2>
            <h2 style={{ fontSize: "2.5em", margin: 0, marginBottom: 20, textAlign: 'center' }}>
            {battleResult === "win" ? "Перемога!" : "Поразка!"}
            </h2>
            <p style={{ fontSize: "1.1em", margin: 0, marginBottom: 30, textAlign: 'center' }}>
            {battleResult === "win"
                ? "✨ Вам зараховано винагороду! ✨"
                : "Схоже, не пощастило цього разу..."}
            </p>
            <Button
            onClick={() => setShowLog(prev => !prev)}
            mode="outline" // Стиль VKUI
            style={{
                marginBottom: 25,
                // backgroundColor: "transparent", // Обробляється режимом
                // border: "1px solid #fff", // Обробляється режимом
                // borderRadius: 8, // Обробляється режимом
                // color: "#fff", // Обробляється режимом
            }}
            aria-label={showLog ? "Сховати лог бою" : "Показати лог бою"}
            >
            📜 {showLog ? "Сховати лог бою" : "Переглянути лог бою"}
            </Button>
            {/* Відображення логу всередині модального вікна */}
            {showLog && (
            <div
                style={{
                // marginTop: 20, // Ні, оскільки це умовно
                maxHeight: 150, // Зменшена висота
                overflowY: "auto",
                padding: 12,
                border: "1px solid #555", // Скоригована рамка
                borderRadius: 8,
                backgroundColor: "rgba(0,0,0,0.3)", // Темніший прозорий
                width: "90%",
                maxWidth: "400px", // Максимальна ширина для логу
                color: "#eee", // Світліший текст для логу
                marginBottom: "20px" // Простір перед кнопками
                }}
                aria-label="Журнал бою"
            >
                {log.length === 0
                ? <div style={{ opacity: 0.6 }}>Лог ще порожній</div>
                : log.map((entry, idx) => (
                    <div key={idx} style={{paddingBottom: '2px', marginBottom: '2px', borderBottom: '1px dotted #444'}}>{entry}</div>
                ))}
            </div>
            )}
            {/* Кнопки дій для модального вікна */}
            <div style={{
                position:"absolute", // Не абсолютно, якщо вміст модального вікна плаваючий
                bottom: "33px", //
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                animation: "fadeIn 0.6s ease forwards", // Визначте fadeIn
                // paddingBottom: 20, // Відступ на батьківському елементі
                // paddingTop: 20, // Відступ на батьківському елементі
                gap:"15px", // Проміжок між кнопками
                width: "100%",
                maxWidth: "400px", // Максимальна ширина для рядка кнопок
                // backgroundColor: "rgba(0, 0, 0, 0.64)", // Видалено, модальне вікно має фон
            }}>
            <Link href="/home" style={{flex:1}}>
                <Button
                size="m"
                stretched
                style={{
                    // backgroundColor: "#f44336", // Обробляється режимом
                    // color: "#fff", // Обробляється режимом
                    animation: "fadeIn 0.6s ease forwards",
                }}
                aria-label="Втекти додому"
                >
                Втекти
                </Button>
            </Link>
            {battleResult === "win" && (
                <Button
                size="m"
                stretched
                style={{
                    animation: "fadeIn 0.6s ease forwards",
                    backgroundColor: "#4caf50", // Обробляється режимом
                    // color: "#fff" // Обробляється режимом
                    flex:1 // Зробити кнопки рівної ширини
                }}
                aria-label="Далі"
                onClick={handleWinNext} // Використовувати новий обробник
                >
                ⚔️ Далі ⚔️
                </Button>
            )}
            {battleResult === "lose" && (
                <Button
                size="m"
                stretched
                style={{
                    animation: "fadeIn 0.6s ease forwards",
                    // backgroundColor: "#ffc107", // Приклад: бурштиновий колір для "спробувати знову"
                    // color: "#000"
                    flex:1 // Зробити кнопки рівної ширини
                }}
                aria-label="Спробувати знову"
                onClick={handleLossRetry} // Використовувати новий обробник
                >
                🛡️ Спробувати знову 🛡️
                </Button>
            )}
            </div>
        </div>
        )}
      {/* </Card> Кінець контейнера Card модального вікна - переконайтеся, що цей Card не ламає макет, якщо він не призначений бути обгорткою модального вікна */}
    </Page>
  );
}