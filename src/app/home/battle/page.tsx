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
  | { type: 'FLEE' }
  | { type: 'BATTLE_END' }
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
  const [enemiesDefeatedInSession, setEnemiesDefeatedInSession] = useState(0);

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
    // Цей хук відповідає за ініціалізацію чату, коли дані гравця завантажені
    if (playerData && chatHistory.length === 0) {
        
        // --- ВАЖЛИВО: Визначаємо промт ТУТ, всередині if ---
        // Тепер playerData гарантовано існує, і помилок не буде
        interface SystemPromptPlayerData {
          level: number;
          character_class: string;
        }

        const initialSystemPrompt = `Act as a dark fantasy RPG dungeon master. Your response must be ONLY a JSON object.
      The JSON structure is: {"story": "...", "choices": ["...", "..."], "outcome": ..., "choiceOutcomes": {...}}.

      --- CORE RULES HIERARCHY (VERY IMPORTANT) ---
      1.  **GAME OVER & FINAL BLOW rules are TOP PRIORITY.** They override all other rules.
      2.  **FLEEING rule is second priority.**
      3.  All other rules follow.

      --- FIELD DESCRIPTIONS ---
      1.  "story": The narrative text describing the current situation.
      2.  "choices": An array of strings representing the player's possible actions.
      3.  "outcome": An immediate outcome that happens regardless of the player's choice. It can be a single object or an array of objects.
      4.  "choiceOutcomes": An object where keys are the EXACT text from the "choices" array, and values are outcomes that happen ONLY if the player makes that specific choice.

      --- OUTCOME TYPES ---
      - Reward: {"type": "REWARD", "item": "points" | "atl_balance" | "ton_balance" | "energy", "amount": ...}.
      -   Experience: {"type": "XP", "amount": ...}.
      -   Initiate Battle: {"type": "BATTLE", "enemy": {"name": "...", "health": 30, "attack": 5, "defense": 2}}.
      -   Found Item: {"type": "ITEM", "item_key": "...", "item_name": "...", "item_type": "...", "sub_type": "...", "rarity": "...", "stats": {...}}.
      -   Combat Turn: {"type": "COMBAT_TURN", "player_hp_change": ..., "enemy_hp_change": ...}.
      -   Game Over: {"type": "GAME_OVER", "reason": "..."}.
      -   Flee: {"type": "FLEE"}.
      -   BATTLE_END: {"type": "BATTLE_END"}.

      --- RULES FOR ITEMS (VERY IMPORTANT) ---
      -   You MUST generate items by combining an \`item_type\` and a \`sub_type\` from the lists below.
      -   You MUST provide:
          1.  A creative and descriptive \`item_name\` in the user's language.
          2.  A unique \`item_key\` in English snake_case based on the item name (e.g., for "Іржавий кинджал лісника", the key could be "foresters_rusty_dagger").
          3.  The chosen \`item_type\` and \`sub_type\`.
          4.  \`stats\` appropriate for the item.

      -   **ALLOWED ITEM TYPES AND SUBTYPES:**

          -   If \`item_type\` is **"weapon"**, \`sub_type\` MUST be one of: \`sword\`, \`dagger\`, \`axe\`, \`bow\`, \`staff\`, \`mace\`, \`spear\`.
          -   If \`item_type\` is **"armor"**, \`sub_type\` MUST be one of: \`helmet\`, \`chestplate\`, \`gloves\`, \`boots\`, \`shield\`, \`greaves\`.
          -   If \`item_type\` is **"consumable"**, \`sub_type\` MUST be one of: \`potion\`, \`food\`, \`scroll\`, \`crystal\`.
          -   If \`item_type\` is **"material"**, \`sub_type\` MUST be one of: \`wood\`, \`ore\`, \`pelt\`, \`fang\`, \`herb\`, \`essence\`, \`gemstone\`.
          -   If \`item_type\` is **"artifact"**, \`sub_type\` MUST be one of: \`ring\`, \`amulet\`, \`talisman\`, \`orb\`.

      --- XP & REWARD LOGIC (LOYAL RULES) ---
      -   The player should be rewarded with a small amount of XP (e.g., 5 to 10) for making progress.
      -   **Non-Combat Actions:** For any choice made outside of combat, the "outcome" array SHOULD contain an XP object. e.g., [{"type": "XP", "amount": 5}].
      -   **Combat Actions:** For a standard combat turn (that is not a final blow), the "outcome" array MUST contain TWO objects: [{"type": "COMBAT_TURN", ...}, {"type": "XP", "amount": 5}].
      -   **Other rewards** (points, atl_balance, etc.) should still be given out according to their own rarity rules (e.g., for winning, finding treasures), not necessarily on every turn.
      -   **Energy:** Energy is **NOT** a random drop. It can **ONLY** be awarded when the player makes a specific choice to rest or recover (e.g., "Відпочити біля джерела", "Помедитувати").
          -   When you offer such a choice, you MUST link the energy reward to it using the \`choiceOutcomes\` field.
          -   The amount should be small (e.g., 2 to 7).

      --- RULE FOR THE FINAL BLOW (TOP PRIORITY) ---
      -   This rule OVERRIDES all other combat rules. 
      -   ONLY when the player's attack reduces the enemy's HP to 0 or less:
          -   The "story" MUST describe the victory.
          -   The "outcome" array MUST contain THREE objects in this order: 
        1. The final "COMBAT_TURN" object showing the killing blow.
        2. The "XP" reward for winning the battle (usually enemy's max health).
        3. A "BATTLE_END" object: \`{"type": "BATTLE_END"}\`. THIS IS MANDATORY.
          -   The "choices" array MUST be replaced with appropriate POST-BATTLE actions.

      --- RULE FOR FLEEING (HIGH PRIORITY) ---
      -   If the player's choice is "🏃 Втекти":
      -   There is a **30% CHANCE that the escape FAILS**.
          -   If it FAILS: The "story" must describe the failure. The "outcome" MUST be a single 'COMBAT_TURN' object where the player takes damage.
      -   If it SUCCEEDS:
          -   The "story" must describe a successful escape with a penalty.
          -   The "outcome" array MUST contain TWO objects:
        1. \`{"type": "FLEE"}\`
        2. A penalty object: \`{"type": "REWARD", "item": "points", "amount": -X}\` where X is a small random integer between 5 and 15.
          -   The "choices" array MUST be replaced with post-escape actions.

      --- GENERAL RULES ---
      -   When in combat AND the enemy is NOT defeated in the current turn, the "choices" array MUST be exactly: ["🗡️ Атакувати", "🛡️ Захищатись", "🏃 Втекти"].
      -   The player is a Level ${(playerData as SystemPromptPlayerData).level} ${(playerData as SystemPromptPlayerData).character_class}.
      -   The adventure is an endless journey.
      -   If player energy reaches 0, the outcome MUST be {"type": "GAME_OVER", "reason": "Ви повністю виснажились і знепритомніли від втоми."}.
      `;

        const initialHistory = [
            { role: "user", parts: [{ text: initialSystemPrompt }] },
            { 
                role: "model", 
                parts: [{ 
                    text: JSON.stringify({ 
                        story: "Ворота Артіліта (Artilith) важко зачиняються за твоєю спиною. Перед тобою розстеляється похмурий, шепочучий ліс...", 
                        choices: ["Йти вглиб лісу", "Йти узліссям на схід", "Перевірити спорядження"], 
                        outcome: [{"type": "XP", "amount": 5}] 
                    }) 
                }] 
            }
        ];
        setChatHistory(initialHistory);
        setStory("Ворота Артіліта (Artilith) важко зачиняються за твоєю спиною. Перед тобою розстеляється похмурий, шепочучий ліс, що оточує місто. Повітря густе від невимовної магії та прихованих небезпек. Куди попрямуєш?");
        setChoices(["Йти вглиб лісу", "Йти узліссям на схід", "Перевірити спорядження"]);
    }
}, [playerData, chatHistory.length]);

  const processOutcome = useCallback(async (outcomeToProcess: Outcome | Outcome[]) => {
    if (!outcomeToProcess || !userId) return;
    const outcomes = Array.isArray(outcomeToProcess) ? outcomeToProcess : [outcomeToProcess];

    // Робимо копії станів, щоб працювати з актуальними даними
    let currentPlayerData = playerData;
    let currentEnemy = enemy;

    for (const singleOutcome of outcomes) {
        if (!singleOutcome) continue;

        switch (singleOutcome.type) {
            case 'BATTLE':
                toast(`На вас напав ${singleOutcome.enemy.name}!`, { icon: '⚔️' });
                const newEnemy = { ...singleOutcome.enemy, maxHealth: singleOutcome.enemy.health };
                setEnemy(newEnemy);
                setIsInCombat(true);
                setChoices(combatChoices);
                currentEnemy = newEnemy;
                break;

            case 'COMBAT_TURN':
                if (!currentPlayerData || !currentEnemy) break;
                
                const playerChange = singleOutcome.player_hp_change ?? 0;
                const enemyChange = singleOutcome.enemy_hp_change ?? 0;

                const newPlayerHP = Math.max(0, currentPlayerData.currentHP + playerChange);
                const newEnemyHP = Math.max(0, currentEnemy.health + enemyChange);
                
                currentPlayerData = { ...currentPlayerData, currentHP: newPlayerHP };
                currentEnemy = { ...currentEnemy, health: newEnemyHP };
                
                if (newEnemyHP <= 0) {
                    toast.success(`Ви перемогли ${currentEnemy.name}!`);
                    setEnemiesDefeatedInSession(prev => prev + 1);
                    setIsInCombat(false);
                    currentEnemy = null; 
                } else if (newPlayerHP <= 0) {
                    toast.error("Вас перемогли...");
                    // Викликаємо GAME_OVER, але не робимо return, щоб стан оновився в кінці
                    await processOutcome({ type: 'GAME_OVER', reason: 'Ви загинули в бою.' });
                }
                break;

                case 'BATTLE_END':
                    setIsInCombat(false);
                    setEnemy(null);
                    break;

                case 'FLEE':
                    toast("Ви втекли з бою!", { icon: "🏃" });
                    setIsInCombat(false);
                    setEnemy(null);
                    break;

            // --- ЗМІНА: Об'єднано REWARD та XP ---
            case 'REWARD':
            case 'XP': {
                const isXp = singleOutcome.type === 'XP';
                const statName = isXp ? 'experience' : singleOutcome.item;
                const amount = singleOutcome.amount;

                const { error } = await supabase.rpc('increment_user_stat', { 
                    p_user_id: String(userId), p_stat_name: statName, p_increment_value: amount 
                });
                
                if (error) {
                    toast.error(`Помилка нарахування: ${error.message}`);
                    break;
                }

                let icon = '🎁';
                if (isXp) icon = '🔷';
                else if (singleOutcome.item === 'points') icon = '🪨';
                else if (singleOutcome.item === 'atl_balance') icon = '🪙';
                else if (singleOutcome.item === 'ton_balance') icon = '💎';
                
                const sign = amount >= 0 ? '+' : '';
                const message = `${sign}${amount} ${icon}`;

                addToLog(message);
                updateSummary(icon, amount);
                break;
            }
            
            case 'ITEM': {
              const { item_key, item_name, item_type, sub_type, rarity, stats } = singleOutcome;

              // --- ЗМІНА ТУТ: Прибираємо всю логіку пошуку зображення ---
              // Тепер ми просто передаємо дані, а база даних сама знайде картинку.
              const { data: newItemId, error: createItemError } = await supabase.rpc('get_or_create_item', { 
                  p_item_key: item_key,
                  p_name: item_name,
                  p_item_type: item_type,
                  p_sub_type: sub_type,
                  p_rarity: rarity,
                  p_stats: stats || {}
              });

              if (createItemError || !newItemId) {
                  toast.error("Помилка створення предмета.");
                  console.error('Error creating item:', createItemError);
                  break;
              }

              const { error: stackError } = await supabase.rpc('add_or_stack_item', { p_user_id: userId, p_item_id: newItemId });
              
              if (stackError) {
                  toast.error(`Помилка додавання в інвентар: ${stackError.message}`);
                  break;
              }
              
              const message = `Знайдено: ${item_name}`;
              addToLog(message);
              updateSummary(item_name, 1);
              toast.success(message);
              break;
          }

          case 'GAME_OVER':
                setStory(singleOutcome.reason);
                setChoices([]);
                setIsGameOver(true);
                setIsInCombat(false);
                setEnemy(null);
                saveAdventureStats(); 
                // Одразу оновлюємо стан, не чекаючи кінця функції
                setPlayerData(currentPlayerData);
                return; // Завершуємо виконання
        }
    }

    // Після циклу один раз оновлюємо глобальний стан
    setPlayerData(currentPlayerData);
    setEnemy(currentEnemy);

}, [userId, playerData, enemy, combatChoices, addToLog, updateSummary]); // <-- Правильні залежності

  
  const handleChoice = useCallback(async (choice: string) => {
    if (!playerData || isLoading || isGameOver) return;
    if (energy < 1) {
        toast.error("Недостатньо енергії для дії!");
        return;
    }

    setIsLoading(true);
    await spendEnergy(1);
    
    if (pendingOutcomes && pendingOutcomes[choice]) {
        await processOutcome(pendingOutcomes[choice]);
        setPendingOutcomes(null); 
    }
    
    const energyAfterAction = energy - 1;
    let promptText = `My choice is: "${choice}". My character stats: Energy: ${energyAfterAction}.`;
    
    if (isInCombat && enemy) {
        promptText = `My character stats: HP ${playerData.currentHP}/${playerData.health}, ATK ${playerData.attack}, DEF ${playerData.defense}, Energy: ${energyAfterAction}. My enemy is ${enemy.name} with ${enemy.health} current HP (max ${enemy.maxHealth}), ${enemy.attack} ATK, ${enemy.defense} DEF. My chosen action is: "${choice}". **Narrate this single combat turn and calculate the damage exchange for this turn ONLY.** The response MUST include a 'COMBAT_TURN' outcome. If this specific attack defeats the enemy, apply the 'FINAL BLOW' rule instead.`;
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
            
            if (parsedResponse.outcome) {
                await processOutcome(parsedResponse.outcome);
            }
            setPendingOutcomes(parsedResponse.choiceOutcomes ?? null);

            setChatHistory([...newHistory, { role: "model", parts: [{ text: jsonMatch[0] }] }]);
            setStory(parsedResponse.story);
            setChoices(parsedResponse.choices ?? []);

        } else { throw new Error("Invalid AI response structure."); }
        setAdventureStep(prev => prev + 1);
    } catch (error: any) {
        console.error("!!! Critical Error in handleChoice !!!", error);
        setStory("Темрява згущується... Спробуй зробити інший вибір. (Сталася непередбачувана подія).");
    } finally {
        setIsLoading(false);
    }
}, [chatHistory, playerData, isLoading, isGameOver, energy, spendEnergy, isInCombat, enemy, processOutcome, pendingOutcomes]);

  const saveAdventureStats = useCallback(async () => {
      // Не зберігаємо, якщо гравець нічого не зробив
      if (!userId || adventureStep <= 1 && enemiesDefeatedInSession === 0) return;

      await supabase.rpc('update_user_adventure_stats', {
          p_user_id: String(userId),
          p_session_stage_reached: adventureStep,
          p_session_enemies_defeated: enemiesDefeatedInSession
      });
  }, [userId, adventureStep, enemiesDefeatedInSession]);

  const handleEndAdventure = async () => {
      await saveAdventureStats();
      router.push('/home');
  };

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
        
        <button style={styles.backButton} onClick={handleEndAdventure} disabled={isLoading}>
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
