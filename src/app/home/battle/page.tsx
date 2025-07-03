"use client";
import React, { useState, useCallback, useEffect, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from "react-hot-toast";
import { useEnergy } from '@/context/EnergyContext';
import { getPlayerStats } from '@/utils/getPlayerStats';
import { fetchInventory } from '@/hooks/useInventory';
import { EnemyStatusBar } from '@/components/Adventure/EnemyStatusBar';

// --- СТИЛІ ---
const styles: { [key: string]: CSSProperties } = {
  pageContainer: { width: '100vw', height: '100vh', backgroundImage: `url('/bg/dark_forest_path_blur.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column', fontFamily: "'Spectral', serif" },
  storyContainer: { flex: 1, overflowY: 'auto', padding: '20px', paddingTop: '10px', color: '#e0e7ff', display: 'flex', flexDirection: 'column' },
  storyContent: { backgroundColor: 'rgba(10, 5, 20, 0.7)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(129, 140, 248, 0.2)', fontSize: '18px', lineHeight: 1.7, marginTop: 'auto' },
  playerStatusContainer: { padding: '10px 15px', background: 'linear-gradient(to top, rgba(10, 5, 20, 1), rgba(10, 5, 20, 0.7))', borderTop: '1px solid rgba(129, 140, 248, 0.3)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '15px' },
  playerStat: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: '#fff' },
  actionsContainer: { padding: '15px', background: 'rgba(10, 5, 20, 1)', display: 'flex', flexDirection: 'column', gap: '10px' },
  actionButton: { padding: "16px 20px", fontSize: 16, borderRadius: '10px', border: "1px solid rgba(129, 140, 248, 0.5)", background: 'linear-gradient(145deg, #4338ca, #6d28d9)', color: "#fff", cursor: "pointer", transition: "transform 0.1s ease, box-shadow 0.2s ease", fontWeight: 600, boxShadow: "0 4px 15px rgba(0,0,0,0.3)", textAlign: 'center' },
  backButton: { padding: "12px 20px", fontSize: 16, borderRadius: '10px', border: "1px solid rgba(100, 116, 139, 0.7)", background: 'rgba(100, 116, 139, 0.5)', color: "#e0e7ff", cursor: "pointer", transition: "background-color 0.2s ease", fontWeight: 500, textAlign: 'center', marginTop: '10px' },
  loadingOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10, 5, 20, 0.85)", backdropFilter: 'blur(5px)', display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, zIndex: 100, color: '#fff' },
  // FIX: Стилі для логу подій
  logContainer: { 
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 5, 20, 0.85)',
    backdropFilter: 'blur(10px)',
    zIndex: 110,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '20px',
  },
  logMessage: { 
    fontSize: '16px', 
    color: '#c7d2fe', 
    marginBottom: '8px', 
    animation: 'fadeIn 0.5s ease',
    borderBottom: '1px solid rgba(129, 140, 248, 0.1)',
    paddingBottom: '8px',
  },
  logButton: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'rgba(129, 140, 248, 0.2)',
    border: '1px solid rgba(129, 140, 248, 0.5)',
    color: '#e0e7ff',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: 50,
  }
};

// --- ІНТЕРФЕЙСИ ---
interface Enemy { name: string; health: number; maxHealth: number; attack: number; defense: number; }
interface LogEntry { id: number; message: string; }
type Outcome =
  | { type: 'REWARD'; item: 'points' | 'atl_balance' | 'ton_balance'; amount: number }
  | { type: 'XP'; amount: number }
  | { 
      type: 'ITEM'; 
      item_key: string;
      item_name: string; 
      item_type: string;
      sub_type: string;
      rarity: string; 
      stats: { damage?: number; defense?: number; };
    } 
  | { type: 'BATTLE'; enemy: Omit<Enemy, 'maxHealth'> }
  | { type: 'COMBAT_TURN'; player_hp_change: number; enemy_hp_change: number; }
  | { type: 'GAME_OVER'; reason: string; } // Новий тип
  | null;
interface AIResponse {
  story: string;
  choices: string[];
  outcome?: Outcome | Outcome[];
  choiceOutcomes?: { [key: string]: Outcome | Outcome[] }; // Ключ - це текст вибору
}
interface PlayerData {
  level: number; character_class: string; points: number;
  health: number; attack: number; defense: number; currentHP: number;
}

// --- Компонент панелі стану гравця ---
const PlayerStatusBar = ({ playerData }: { playerData: PlayerData | null }) => {
  // Використовуємо хук useEnergy прямо тут, щоб завжди мати актуальне значення
  const { energy } = useEnergy(); 

  if (!playerData) return null;
  return (
    <div style={styles.playerStatusContainer}>
      <div style={styles.playerStat}><span>❤️</span><span>{playerData.currentHP} / {playerData.health}</span></div>
      <div style={styles.playerStat}><span>🗡️</span><span>{playerData.attack}</span></div>
      <div style={styles.playerStat}><span>🛡️</span><span>{playerData.defense}</span></div>
      <div style={styles.playerStat}><span>⚡</span><span>{energy}</span></div>
    </div>
  );
};

// --- ГОЛОВНИЙ КОМПОНЕНТ ---
export default function TextAdventurePage() {
  const router = useRouter();
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;
  const { energy, spendEnergy } = useEnergy();
  
  const [story, setStory] = useState<string>("Завантаження...");
  const [choices, setChoices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isInCombat, setIsInCombat] = useState<boolean>(false);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const combatChoices = ["🗡️ Атакувати", "🛡️ Захищатись", "🏃 Втекти"];
  const [pendingOutcomes, setPendingOutcomes] = useState<{ [key: string]: Outcome | Outcome[] } | null>(null);
  
  // FIX: Стан для логу подій та фінального звіту
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [adventureStep, setAdventureStep] = useState(1);
  const [adventureSummary, setAdventureSummary] = useState<Map<string, number>>(new Map());
  const [isGameOver, setIsGameOver] = useState(false);

  // FIX: Функція для додавання повідомлень в лог
  const addToLog = (message: string) => {
    setEventLog(prevLog => [{ id: Date.now(), message }, ...prevLog].slice(0, 5)); // Зберігаємо останні 5 повідомлень
  };
  
  // FIX: Функція для оновлення звіту
  const updateSummary = (key: string, amount: number) => {
    setAdventureSummary(prevSummary => {
      const newSummary = new Map(prevSummary);
      newSummary.set(key, (newSummary.get(key) || 0) + amount);
      return newSummary;
    });
  };

  useEffect(() => {
    if (!userId) return;

    const fetchPlayerData = async () => {
      setIsLoading(true);
      try {
        // 1. Одночасно завантажуємо дані користувача та його повний інвентар
        const [userDataRes, inventoryData] = await Promise.all([
          supabase.from('users').select('level, character_class, points').eq('id', String(userId)).single(),
          fetchInventory(String(userId)) // Використовуємо наш правильний хук
        ]);

        if (userDataRes.error) throw userDataRes.error;

        const userData = userDataRes.data;
        if (!userData) {
            toast.error("Не вдалося завантажити дані гравця.");
            return;
        }

        // 2. Розраховуємо характеристики, передаючи інвентар І рівень
        const playerStats = getPlayerStats(inventoryData, userData.level ?? 1);

        // 3. Збираємо всі дані до купи і встановлюємо стан
        setPlayerData({
          level: userData.level ?? 1,
          character_class: userData.character_class,
          points: userData.points,
          ...playerStats,
          currentHP: playerStats.health, // Початкове здоров'я дорівнює максимальному
        });

      } catch (error: any) {
        console.error("Помилка завантаження даних гравця:", error);
        toast.error(`Помилка: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerData();
  }, [userId]);
  
  useEffect(() => {
    if (playerData && chatHistory.length === 0) {
      const initialSystemPrompt = `Act as a dark fantasy RPG dungeon master. Your response must be ONLY a JSON object.
        The JSON structure is: {"story": "...", "choices": ["...", "..."], "outcome": ..., "choiceOutcomes": {...}}.

        --- FIELD DESCRIPTIONS ---

        1.  "story": The narrative text describing the current situation.
        2.  "choices": An array of strings representing the player's possible actions.
        3.  "outcome": An immediate outcome that happens regardless of the player's choice. Use this for things that happen TO the player, like starting a battle or gaining passive XP. It can be a single object or an array of objects.
        4.  "choiceOutcomes": **(NEW & IMPORTANT)** An object where keys are the EXACT text from the "choices" array, and values are the outcomes that will happen ONLY if the player makes that specific choice. Use this for rewards the player can choose to take or ignore.

        --- NEW LOGIC FOR REWARDS (ITEMS, POINTS, etc.) ---

        -   **DO NOT** put discoverable items or rewards in the main "outcome" field.
        -   Instead, describe the potential reward in the "story" and link the reward object to a specific choice in the "choiceOutcomes" field.

        --- EXAMPLE OF NEW LOGIC ---

        Correct Example:
        {
          "story": "You defeat the goblin. On the ground, you see a Rusty Dagger.",
          "choices": ["🗡️ Take the dagger", "🚶 Leave it"],
          "outcome": { "type": "XP", "amount": 30 }, // Immediate XP for winning the battle
          "choiceOutcomes": {
            "🗡️ Take the dagger": { "type": "ITEM", "item_name": "Rusty Dagger", "item_type": "weapon", "sub_type": "dagger", "rarity": "common", "stats": {"damage": 2, "defense": 0} }
          }
        }
        // In this example, the player gets XP immediately, but the dagger is only received if they choose to take it.
        

        --- OUTCOME TYPES (Unchanged) ---

        -   Reward: {"type": "REWARD", "item": "points" | "atl_balance" | "ton_balance", "amount": ...}.
        -   Experience: {"type": "XP", "amount": ...}.
        - Initiate Battle: {"type": "BATTLE", "enemy": {"name": "...", "health": 30, "attack": 5, "defense": 2}}.
          - The "enemy" object MUST contain "name", "health", "attack", and "defense". All must be numbers, except "name".
        - Found Item: {"type": "ITEM", "item_key": "...", "item_name": "...", "item_type": "...", "sub_type": "...", "rarity": "common", "stats": {...}}.
          - RULES FOR ITEMS:
                - You MUST generate a stable, English, snake_case "item_key". This key must be unique for each base item type (e.g., "health_potion", "iron_sword").
                - You MUST also generate a translated "item_name" based on the user's language.
                - You are free to invent any creative "item_name".
                - You MUST classify it with a "sub_type".
                - "sub_type" MUST be a single, lowercase English word.
                - For now, the "rarity" for ALL generated items MUST be exactly "common".
        - Combat Turn: {"type": "COMBAT_TURN", "player_hp_change": -5, "enemy_hp_change": -10}.
          - "player_hp_change" and "enemy_hp_change" are REQUIRED and MUST be numbers (positive for healing, negative for damage).
        -   No special outcome: null.

        --- RULE FOR THE FINAL BLOW ---

        -   When the player's attack is enough to defeat the enemy (reduce its HP to 0 or less):
        -   Your "story" MUST describe the victory.
        -   The "outcome" array MUST contain BOTH of these objects:
            1.  The final {"type": "COMBAT_TURN", "player_hp_change": 0, "enemy_hp_change": -XX} object that reduces the enemy's health to 0 or less. The damage number XX must be sufficient.
            2.  The {"type": "XP", "amount": ...} reward for defeating the enemy (equal to the enemy's max health).
        -   The "choices" array MUST contain appropriate post-battle actions (e.g., ["Оглянути тіло", "Продовжити шлях"]).

        --- GENERAL RULES ---

        -   When in combat (and the enemy is not defeated yet), the "choices" array MUST be exactly: ["🗡️ Атакувати", "🛡️ Захищатись", "🏃 Втекти"].
        -   DO NOT show calculations.
        -   The player is a Level ${playerData.level} ${playerData.character_class}.
        -   GAME_OVER: {"type": "GAME_OVER", "reason": "..."}.
        -   I will provide the player's current energy in the prompt like "My character stats: Energy: 1, ...".
        -   If you see that the player's energy is 0 AFTER they perform an action, the story MUST end. The "outcome" for this situation MUST be {"type": "GAME_OVER", "reason": "Ви повністю виснажились і знепритомніли від втоми."}.
        `;
      const initialHistory = [
        { role: "user", parts: [{ text: initialSystemPrompt }] },
        { role: "model", parts: [{ text: JSON.stringify({ story: "Ти стоїш на роздоріжжі в Темному лісі...", choices: ["Йти на північ", "Йти на схід", "Оглянутись навколо"], outcome: null }) }] }
      ];
      setChatHistory(initialHistory);
      setStory("Ти стоїш на роздоріжжі в Темному лісі...");
      setChoices(["Йти на північ", "Йти на схід", "Оглянутись навколо"]);
    }
  }, [playerData, chatHistory.length]);

  const processOutcome = useCallback(async (outcomeToProcess: Outcome | Outcome[]) => {
    if (!outcomeToProcess || !userId) return;
    const outcomes = Array.isArray(outcomeToProcess) ? outcomeToProcess : [outcomeToProcess];

    for (const singleOutcome of outcomes) {
        if (!singleOutcome) continue;

        switch (singleOutcome.type) {
            case 'BATTLE':
                toast(`На вас напав ${singleOutcome.enemy.name}!`, { icon: '⚔️' });
                setEnemy({ ...singleOutcome.enemy, maxHealth: singleOutcome.enemy.health });
                setIsInCombat(true);
                setChoices(combatChoices);
                break;

            case 'COMBAT_TURN':
                // Оновлюємо здоров'я гравця
                setPlayerData(prevData => {
                    if (!prevData) return null;
                    const newPlayerHP = Math.max(0, prevData.currentHP + (singleOutcome.player_hp_change ?? 0));
                    
                    if (newPlayerHP <= 0 && isInCombat) { // Перевіряємо, чи гравець ще в бою
                        toast.error("Вас перемогли...");
                        setIsGameOver(true); // Завершуємо гру
                    }
                    return { ...prevData, currentHP: newPlayerHP };
                });

                // Оновлюємо здоров'я ворога і перевіряємо на перемогу
                setEnemy(prevEnemy => {
                    if (!prevEnemy) return null; // Якщо ворога вже немає, нічого не робимо

                    const newEnemyHP = Math.max(0, prevEnemy.health + (singleOutcome.enemy_hp_change ?? 0));

                    // Якщо ворога переможено, завершуємо бій і повертаємо null
                    if (newEnemyHP <= 0) {
                        toast.success(`Ви перемогли ${prevEnemy.name}!`);
                        setIsInCombat(false); // <--- Завершуємо бій
                        return null; // <--- Прибираємо ворога (і його статус-бар)
                    }

                    // Інакше просто оновлюємо здоров'я ворога
                    return { ...prevEnemy, health: newEnemyHP };
                });
                break;

            case 'REWARD':
            case 'XP':
                const statName = singleOutcome.type === 'XP' ? 'experience' : singleOutcome.item;
                const { error } = await supabase.rpc('increment_user_stat', { 
                    p_user_id: String(userId), p_stat_name: statName, p_increment_value: singleOutcome.amount 
                });
                if (!error) {
                    let icon = '🎁';
                    if (singleOutcome.type === 'REWARD') {
                        if(singleOutcome.item === 'points') icon = '🪨'; 
                        else if(singleOutcome.item === 'atl_balance') icon = '🪙'; 
                        else if(singleOutcome.item === 'ton_balance') icon = '💎';
                    } else if (singleOutcome.type === 'XP') icon = '🔷';
                    const message = `+${singleOutcome.amount} ${icon}`;
                    addToLog(message);
                    updateSummary(icon, singleOutcome.amount);
                }
                break;

            case 'GAME_OVER':
                setStory(singleOutcome.reason);
                setChoices([]);
                setIsGameOver(true);
                setIsInCombat(false); // На випадок, якщо гра завершилась не через бій
                setEnemy(null);
            break;
            
            case 'ITEM':
                  
        
            if (singleOutcome.type === 'ITEM') {
              // Отримуємо дані від AI
              const { item_key, item_name, item_type, sub_type, rarity, stats } = singleOutcome;

              // Логіка пошуку зображення
              const primaryTemplateKey = `${item_type}_${sub_type}_${rarity}`;
              const fallbackTemplateKey = `${item_type}_${sub_type}_common`;
              let imageUrl = null;
              const { data: primaryTemplate } = await supabase
                  .from('image_templates')
                  .select('image_url')
                  .eq('template_key', primaryTemplateKey)
                  .single();
              
              if (primaryTemplate) {
                  imageUrl = primaryTemplate.image_url;
              } else {
                  const { data: fallbackTemplate } = await supabase
                      .from('image_templates')
                      .select('image_url')
                      .eq('template_key', fallbackTemplateKey)
                      .single();
                  if (fallbackTemplate) {
                      imageUrl = fallbackTemplate.image_url;
                  }
              }
              
              // Викликаємо RPC, щоб отримати ID унікального предмету
              const { data: newItemId, error: createItemError } = await supabase.rpc('get_or_create_item', { 
                  p_item_key: item_key,
                  p_name: item_name,
                  p_item_type: item_type,
                  p_sub_type: sub_type,
                  p_rarity: rarity,
                  p_stats: stats || {},
                  p_image_url: imageUrl
              });

              if (createItemError) {
                  toast.error(`Помилка створення предмета: ${createItemError.message}`);
                  console.error('Error creating item definition:', createItemError);
                  return; // Зупиняємо виконання, якщо не вдалося створити предмет
              }
              if (!newItemId) {
                  toast.error("Не вдалося отримати ID предмета.");
                  return;
              }

              const { error: stackError } = await supabase.rpc('add_or_stack_item', {
                p_user_id: userId, // Передаємо як є (число)
                p_item_id: newItemId
              });

              if (stackError) {
                  toast.error(`Помилка додавання в інвентар: ${stackError.message}`);
                  console.error('Error adding/stacking item to inventory:', stackError);
                  return; // Зупиняємо, якщо не вдалося додати в інвентар
              }

              // Показуємо сповіщення, якщо все пройшло успішно
              const message = `Знайдено: ${item_name}`;
              addToLog(message);
              updateSummary(item_name, 1);
              toast.success(message);

              break;
        }
    }
}}, [userId, isInCombat, combatChoices]); // Спрощені залежності

  
  const handleChoice = useCallback(async (choice: string) => {
    if (!playerData || chatHistory.length === 0 || isGameOver) return;

    // Отримуємо найсвіжіше значення енергії
    const currentEnergy = energy;
    const energyCost = 1;

    // Якщо енергії недостатньо, просто показуємо повідомлення і виходимо
    if (currentEnergy < energyCost) {
      toast.error("Недостатньо енергії для дії!");
      return; 
    }
    
    setIsLoading(true);
    await spendEnergy(energyCost);

    // Обробляємо відкладені нагороди, якщо вони є
    if (pendingOutcomes && pendingOutcomes[choice]) {
        const outcomeToProcess = pendingOutcomes[choice];
        await processOutcome(outcomeToProcess);
        setPendingOutcomes(null); 
    }
   
    // Формуємо промпт, включаючи в нього актуальну енергію ПІСЛЯ її витрати
    const energyAfterAction = currentEnergy - energyCost;
    let promptText = `My choice is: "${choice}". My character stats: Energy: ${energyAfterAction}.`;
    
    if (isInCombat && enemy) {
        promptText = `My character stats: HP ${playerData.currentHP}/${playerData.health}, ATK ${playerData.attack}, DEF ${playerData.defense}, Energy: ${energyAfterAction}. My enemy is ${enemy.name} with ${enemy.maxHealth} max HP, ${enemy.attack} ATK, ${enemy.defense} DEF. My chosen action is: "${choice}". Calculate the result and narrate. If this attack defeats the enemy, you MUST include an XP reward: {"type": "XP", "amount": ${enemy.maxHealth}}`;
    }
    
    const newHistory = [...chatHistory, { role: "user", parts: [{ text: promptText }] }];
    const payload = { contents: newHistory };
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        toast.error("API ключ не налаштовано!"); setIsLoading(false); return;
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    let lastRawResponse = '';
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
        
        const result = await response.json();
        if (result.error) throw new Error(`Google API Error: ${result.error.message}`);
        
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            lastRawResponse = result.candidates[0].content.parts[0].text;
            const jsonMatch = lastRawResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return a valid JSON object. Raw response: " + lastRawResponse);
            
            const cleanedJsonString = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
            const parsedResponse: AIResponse = JSON.parse(cleanedJsonString);
            
            // 1. СПОЧАТКУ обробляємо логіку гри (завершення бою, нагороди)
            if (parsedResponse.outcome) {
                await processOutcome(parsedResponse.outcome);
            }
            if (parsedResponse.choiceOutcomes) {
                setPendingOutcomes(parsedResponse.choiceOutcomes);
            } else {
                setPendingOutcomes(null); // Очищуємо, якщо нових відкладених нагород немає
            }

            // 2. ПОТІМ оновлюємо історію, історію чату та вибори
            setChatHistory([...newHistory, { role: "model", parts: [{ text: jsonMatch[0] }] }]);
            setStory(parsedResponse.story);
            setChoices(parsedResponse.choices ?? []);
        } else { throw new Error("Invalid AI response structure. Full response: " + JSON.stringify(result)); }
        setAdventureStep(prev => prev + 1);
    } catch (error: any) {
        console.error("!!! Critical Error in handleChoice !!!");
        console.error("Error Message:", error.message);
        console.error("Last raw response from AI before error:", lastRawResponse || "Not available");
        setStory("Темрява згущується... Спробуй зробити інший вибір. (Сталася непередбачувана подія).");
    } finally {
        setIsLoading(false);
    }
  }, [chatHistory, playerData, isInCombat, enemy, energy, spendEnergy, processOutcome, combatChoices, pendingOutcomes]);

  return (
    <div style={styles.pageContainer}>
      <Toaster position="top-center" />
      {isLoading && ( <div style={styles.loadingOverlay as React.CSSProperties}><span>Доля вирішується...</span></div> )}
      
      {/* Кнопка для перегляду логу подій */}
      <button style={styles.logButton} onClick={() => setIsLogVisible(true)}>
        📜
      </button>

      {/* Модальне вікно (оверлей) для логу подій */}
      {isLogVisible && (
        <div style={styles.logContainer} onClick={() => setIsLogVisible(false)}>
          <h3 style={{color: '#fff', textAlign: 'center', marginBottom: '20px'}}>Журнал подій</h3>
          {eventLog.length > 0 ? eventLog.map(entry => (
            <div key={entry.id} style={styles.logMessage}>{entry.message}</div>
          )) : <p style={{textAlign: 'center', color: '#a7b3d9'}}>Журнал порожній.</p>}
        </div>
      )}

      <main style={styles.storyContainer}>
        
        {isInCombat && <EnemyStatusBar enemy={enemy} stage={adventureStep} />}

        <div style={styles.storyContent}>
          <ReactMarkdown>{story}</ReactMarkdown>
          
          {isGameOver && (
            <div style={{marginTop: '20px', borderTop: '1px solid #444', paddingTop: '20px'}}>
              <h3>Підсумок пригоди:</h3>
              <ul>
                {Array.from(adventureSummary.entries()).map(([key, value]) => (
                  <li key={key}><strong>{key}:</strong> {value.toFixed(4)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <PlayerStatusBar playerData={playerData} />

      <footer style={styles.actionsContainer}>
        {choices.map((choice, index) => (
          <button key={index} style={styles.actionButton} onClick={() => handleChoice(choice)} disabled={isLoading || isGameOver}>
              {choice}
          </button>
        ))}
        
        <button style={styles.backButton} onClick={() => router.push('/home')} disabled={isLoading}>
          🏰 Завершити пригоду
        </button>
      </footer>
        <style>{`
            @keyframes flash-red { 0% { color: #ff4747; transform: scale(1.1); } 100% { color: #fff; transform: scale(1); } }
            .damage-taken { animation: flash-red 0.5s ease-out; }
        `}</style>
    </div>
  );
}
