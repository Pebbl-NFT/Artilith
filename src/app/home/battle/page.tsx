"use client";
import React, { useState, useCallback, useEffect, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from "react-hot-toast";
import { useEnergy } from '@/context/EnergyContext';
import { getPlayerStats } from '@/utils/getPlayerStats';
import { AllItems } from '@/components/Item/Items';
import { addInventoryItem } from '@/hooks/useItemActions';

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
  logContainer: { padding: '10px 20px', maxHeight: '120px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(129, 140, 248, 0.2)' },
  logMessage: { fontSize: '14px', color: '#a7b3d9', marginBottom: '4px', animation: 'fadeIn 0.5s ease' }
};

// --- ІНТЕРФЕЙСИ ---
interface Enemy { name: string; health: number; maxHealth: number; attack: number; defense: number; }
// FIX: Додано тип для логу
interface LogEntry { id: number; message: string; }
// FIX: Додано новий тип для завершення гри
type Outcome =
  | { type: 'REWARD'; item: 'points' | 'atl_balance' | 'ton_balance'; amount: number }
  | { type: 'XP'; amount: number }
  | { type: 'ITEM'; item_name: string; item_type: string; rarity: string; stats: { damage?: number; defense?: number; } }
  | { type: 'BATTLE'; enemy: Omit<Enemy, 'maxHealth'> }
  | { type: 'COMBAT_TURN'; player_hp_change: number; enemy_hp_change: number; }
  | { type: 'GAME_OVER'; reason: string; } // Новий тип
  | null;
interface AIResponse { story: string; choices: string[]; outcome?: Outcome | Outcome[]; }
interface PlayerData {
  level: number; character_class: string; points: number;
  health: number; attack: number; defense: number; currentHP: number;
}

// --- Компонент панелі стану гравця ---
const PlayerStatusBar = ({ playerData }: { playerData: PlayerData | null }) => {
  if (!playerData) return null;
  return (
    <div style={styles.playerStatusContainer}>
      <div style={styles.playerStat}><span>❤️</span><span>{playerData.currentHP} / {playerData.health}</span></div>
      <div style={styles.playerStat}><span>🗡️</span><span>{playerData.attack}</span></div>
      <div style={styles.playerStat}><span>🛡️</span><span>{playerData.defense}</span></div>
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
  
  // FIX: Стан для логу подій та фінального звіту
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
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
      const { data: userData } = await supabase.from('users').select('level, character_class, points').eq('id', String(userId)).single();
      const { data: inventoryData } = await supabase.from("inventory").select("item_id, equipped, upgrade_level").eq("user_id", String(userId));
      const formattedInventory = (inventoryData || []).map((entry) => {
          const itemDetails = AllItems.find((i) => i.item_id === entry.item_id);
          return itemDetails ? { ...itemDetails, ...entry } : null;
      }).filter(Boolean);
      const playerStats = getPlayerStats(formattedInventory as any[]);
      setPlayerData({ ...(userData as any), ...playerStats, currentHP: playerStats.health });
      setIsLoading(false);
    };
    fetchPlayerData();
  }, [userId]);
  
  useEffect(() => {
    if (playerData && chatHistory.length === 0) {
      const initialSystemPrompt = `Act as a dark fantasy RPG dungeon master. Your response must be ONLY a JSON object like {"story": "...", "choices": ["..."], "outcome": ...}.
        The "outcome" field is crucial. It can be a single outcome object or an array of outcome objects, e.g., "outcome": [{"type": "REWARD", ...}, {"type": "XP", ...}].
        Possible outcomes:
        - Reward: {"type": "REWARD", "item": "points" | "atl_balance" | "ton_balance", "amount": ...}.
          - "points" (regular coins, 10-100) are common.
          - "atl_balance" (gold coins, 1-5) are rare.
          - "ton_balance" (blue crystal shards, 0.001-0.01) are extremely rare.
        - Experience: {"type": "XP", "amount": ...}.
          - After every successful non-combat player action (exploring, interacting), grant 5-10 XP.
          - After winning a battle, you MUST grant XP equal to the enemy's max health (e.g., enemy with 30 HP gives 30 XP). This should be in addition to any other rewards.
        - Initiate Battle: {"type": "BATTLE", "enemy": {"name": "Goblin Scout", "health": 30, "attack": 5, "defense": 2}}.
        - Found Item: {"type": "ITEM", "item_name": "...", "item_type": "...", "rarity": "...", "stats": {"damage": 5, "defense": 0}}.
          RULES FOR ITEMS:
          - "stats" MUST be an object. For 'weapon' or 'shield', provide realistic "damage" and "defense" values. For other types, use {"damage": 0, "defense": 0}.
          - "item_type" MUST be one of: 'weapon', 'shield', 'artifact', 'key'.
          - "rarity" MUST be one of: 'common', 'uncommon', 'rare'. Adhere to this probability distribution: 'common' should appear in about 91% of items, 'uncommon' in 6%, and 'rare' in 3%.
        - Combat Turn: {"type": "COMBAT_TURN", "player_hp_change": -5, "enemy_hp_change": -10}.
        - No special outcome: null
        When in combat and I send my action, calculate the damage based on stats (damage = ATK - DEF, min 1). Then narrate the exchange vividly.
        - If the battle is still ongoing, the "choices" array MUST be exactly: ["🗡️ Атакувати", "🛡️ Захищатись", "🏃 Втекти"].
        - If the battle is over, your "story" must reflect this, and the "choices" array must contain the next appropriate non-combat actions.
        DO NOT show calculations.
        The player is a Level ${playerData.level} ${playerData.character_class}. Start the story at a crossroad in a dark forest.
        - GAME_OVER: {"type": "GAME_OVER", "reason": "You ran out of energy and fainted."} - Use this when the player has no more energy.`
      ;
      
      const initialHistory = [
        { role: "user", parts: [{ text: initialSystemPrompt }] },
        { role: "model", parts: [{ text: JSON.stringify({ story: "Ти стоїш на роздоріжжі в Темному лісі...", choices: ["Йти на північ", "Йти на схід", "Оглянутись навколо"], outcome: null }) }] }
      ];
      setChatHistory(initialHistory);
      setStory("Ти стоїш на роздоріжжі в Темному лісі...");
      setChoices(["Йти на північ", "Йти на схід", "Оглянутись навколо"]);
    }
  }, [playerData, chatHistory.length]);

  const processOutcome = useCallback(async (outcome: Outcome | Outcome[]) => {
    if (!outcome || !userId || !playerData) return;
    const outcomes = Array.isArray(outcome) ? outcome : [outcome];

    for (const singleOutcome of outcomes) {
        if (!singleOutcome) continue;

        if (singleOutcome.type === 'BATTLE') {
            toast(`На вас напав ${singleOutcome.enemy.name}!`, { icon: '⚔️' });
            setEnemy({ ...singleOutcome.enemy, maxHealth: singleOutcome.enemy.health });
            setIsInCombat(true);
            setChoices(combatChoices);
        }

        if (singleOutcome.type === 'COMBAT_TURN') {
            const newPlayerHP = Math.max(0, playerData.currentHP + singleOutcome.player_hp_change);
            const newEnemyHP = Math.max(0, enemy ? enemy.health + singleOutcome.enemy_hp_change : 0);
            
            setPlayerData(prev => prev ? { ...prev, currentHP: newPlayerHP } : null);
            setEnemy(prev => prev ? { ...prev, health: newEnemyHP } : null);
            
            if (newEnemyHP <= 0) {
                toast.success(`Ви перемогли ${enemy?.name}!`);
                setIsInCombat(false);
                setEnemy(null);
            } else if (newPlayerHP <= 0) {
                toast.error("Вас перемогли...");
                setIsInCombat(false);
                setEnemy(null);
            }
        }
        
         if (singleOutcome.type === 'REWARD' || singleOutcome.type === 'XP') {
            const statName = singleOutcome.type === 'XP' ? 'experience' : singleOutcome.item;
            const { error } = await supabase.rpc('increment_user_stat', { 
                p_user_id: String(userId), p_stat_name: statName, p_increment_value: singleOutcome.amount 
            });
            if (!error) {
                let icon = '🎁';
                if (singleOutcome.type === 'REWARD') {
                    if(singleOutcome.item === 'points') icon = '🪨'; else if(singleOutcome.item === 'atl_balance') icon = '🪙'; else if(singleOutcome.item === 'ton_balance') icon = '💎';
                } else if (singleOutcome.type === 'XP') icon = '🔷';
                const message = `+${singleOutcome.amount} ${icon}`;
                addToLog(message);
                updateSummary(icon, singleOutcome.amount);
            }
        }
        
        if (singleOutcome.type === 'ITEM') {
            const { data: itemId, error: getItemIdError } = await supabase.rpc('get_or_create_item_id', { 
                p_name: singleOutcome.item_name, 
                p_item_type: singleOutcome.item_type, 
                p_rarity: singleOutcome.rarity, 
                p_stats: singleOutcome.stats || {} 
            });
            if (getItemIdError) throw new Error(`Помилка get_or_create_item_id: ${getItemIdError.message}`);
            if (!itemId) throw new Error("Не вдалося отримати ID предмета.");
            const wasAdded = await addInventoryItem(String(userId), itemId);
            if (!wasAdded) throw new Error(`Не вдалося додати предмет.`);
            if(wasAdded) {
                const message = `Знайдено: ${singleOutcome.item_name}`;
                addToLog(message);
                updateSummary(singleOutcome.item_name, 1);
            }
            toast.success(`Ви знайшли: ${singleOutcome.item_name}!`);
        }

        if (singleOutcome.type === 'GAME_OVER') {
            setStory(singleOutcome.reason);
            setChoices([]);
            setIsGameOver(true);
        }
    }
  }, [userId, playerData, enemy, combatChoices]);

  
  const handleChoice = useCallback(async (choice: string) => {
    if (!playerData || chatHistory.length === 0 || isGameOver) return;

    // FIX: Правильна перевірка енергії
    const energyCost = 1; // Кожна дія коштує 1 енергії
    if (energy < energyCost) {
        setStory("Герой перевтомився і втратив свідомість, 0⚡");
        setChoices([]);
        setIsGameOver(true);
        return;
    }
    
    setIsLoading(true);
    await spendEnergy(energyCost);

    let promptText = `My choice is: "${choice}". Also, every successful non-combat action should grant 5-10 XP via the {"type": "XP", "amount": ...} outcome.`;
    if (isInCombat && enemy) {
        promptText = `My character stats: HP ${playerData.currentHP}/${playerData.health}, ATK ${playerData.attack}, DEF ${playerData.defense}. My enemy is ${enemy.name} with ${enemy.maxHealth} max HP, ${enemy.attack} ATK, ${enemy.defense} DEF. My chosen action is: "${choice}". Calculate the result and narrate. If this attack defeats the enemy, you MUST include an XP reward: {"type": "XP", "amount": ${enemy.maxHealth}}`;
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
            
            setChatHistory([...newHistory, { role: "model", parts: [{ text: jsonMatch[0] }] }]);
            setStory(parsedResponse.story);
            setChoices(parsedResponse.choices ?? []); 
            
            if (parsedResponse.outcome) {
                await processOutcome(parsedResponse.outcome);
            }
        } else { throw new Error("Invalid AI response structure. Full response: " + JSON.stringify(result)); }
    } catch (error: any) {
        console.error("!!! Critical Error in handleChoice !!!");
        console.error("Error Message:", error.message);
        console.error("Last raw response from AI before error:", lastRawResponse || "Not available");
        setStory("Темрява згущується... Спробуй зробити інший вибір. (Сталася помилка. Перевірте консоль для деталей).");
    } finally {
        setIsLoading(false);
    }
  }, [chatHistory, playerData, isInCombat, enemy, energy, spendEnergy, processOutcome, combatChoices]);

  return (
    <div style={styles.pageContainer}>
      <Toaster position="top-center" />
      {isLoading && ( <div style={styles.loadingOverlay as React.CSSProperties}><span>Доля вирішується...</span></div> )}
      
      {/* FIX: Контейнер для логу подій */}
      <div style={styles.logContainer}>
        {eventLog.map(entry => (
          <div key={entry.id} style={styles.logMessage}>{entry.message}</div>
        ))}
      </div>

      <main style={styles.storyContainer}>
        <div style={styles.storyContent}>
          <ReactMarkdown>{story}</ReactMarkdown>
          {/* FIX: Відображення фінального звіту */}
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
        {/* Кнопка повернення тепер доступна завжди */}
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
