"use client";
import React, { useState, useCallback, useEffect, CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from "react-hot-toast";
import { useEnergy } from '@/context/EnergyContext';
import { getPlayerStats } from '@/utils/getPlayerStats';
import { AllItems } from '@/components/Item/Items';


// --- СТИЛІ (додано стилі для панелі гравця) ---
const styles: { [key: string]: CSSProperties } = {
    pageContainer: {
        width: '100vw', height: '100vh',
        backgroundImage: `url('/bg/dark_forest_path_blur.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Spectral', serif",
    },
    storyContainer: {
        flex: 1, overflowY: 'auto',
        padding: '70px 20px 20px 20px', color: '#e0e7ff',
    },
    storyContent: {
        backgroundColor: 'rgba(10, 5, 20, 0.7)', backdropFilter: 'blur(10px)',
        padding: '20px', borderRadius: '12px', border: '1px solid rgba(129, 140, 248, 0.2)',
        fontSize: '18px', lineHeight: 1.7,
    },
    // --- НОВИЙ СТИЛЬ: Панель стану гравця ---
    playerStatusContainer: {
        padding: '10px 15px',
        background: 'linear-gradient(to top, rgba(10, 5, 20, 1), rgba(10, 5, 20, 0.7))',
        borderTop: '1px solid rgba(129, 140, 248, 0.3)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        gap: '15px'
    },
    playerStat: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#fff',
    },
    actionsContainer: {
        padding: '15px',
        background: 'rgba(10, 5, 20, 1)',
        display: 'flex', flexDirection: 'column', gap: '10px',
    },
    actionButton: {
        padding: "16px 20px",
        fontSize: 16,
        borderRadius: '10px',
        border: "1px solid rgba(129, 140, 248, 0.5)",
        background: 'linear-gradient(145deg, #4338ca, #6d28d9)',
        color: "#fff",
        cursor: "pointer",
        transition: "transform 0.1s ease, box-shadow 0.2s ease",
        fontWeight: 600,
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        textAlign: 'center',
    },
    loadingOverlay: {
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(10, 5, 20, 0.85)",
        backdropFilter: 'blur(5px)',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        zIndex: 100,
        color: '#fff',
    }
};

// --- ІНТЕРФЕЙСИ (РОЗШИРЕНО) ---
interface PlayerStats {
    health: number;
    attack: number;
    defense: number;
}
interface PlayerData extends PlayerStats {
    level: number;
    character_class: string;
    points: number;
    currentHP: number; // Поточне здоров'я
}
interface Enemy {
    name: string;
    health: number;
    attack: number;
}
type Outcome = 
    | { type: 'REWARD'; item: 'points' | 'atl_balance'; amount: number }
    | { type: 'ITEM'; item_id: number; item_name: string }
    | { type: 'BATTLE'; enemy: Enemy }
    | null;
interface AIResponse {
    story: string;
    choices: string[];
    outcome?: Outcome;
}
interface PlayerData {
    level: number;
    character_class: string;
    points: number;
}

const PlayerStatusBar = ({ playerData }: { playerData: PlayerData | null }) => {
    if (!playerData) return null;

    return (
        <div style={styles.playerStatusContainer}>
            <div style={styles.playerStat}>
                <span>❤️</span>
                <span>{playerData.currentHP} / {playerData.health}</span>
            </div>
            <div style={styles.playerStat}>
                <span>🗡️</span>
                <span>{playerData.attack}</span>
            </div>
            <div style={styles.playerStat}>
                <span>🛡️</span>
                <span>{playerData.defense}</span>
            </div>
        </div>
    );
};

// =======================================================================
// ГОЛОВНИЙ КОМПОНЕНТ (з новою структурою JSX)
export default function TextAdventurePage() {
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;

    const { energy, spendEnergy } = useEnergy();
    const [isInCombat, setIsInCombat] = useState<boolean>(false);
    const [enemy, setEnemy] = useState<Enemy | null>(null);
    const [story, setStory] = useState<string>("Завантаження вашої унікальної пригоди...");
    const [choices, setChoices] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [chatHistory, setChatHistory] = useState<any[]>([]);

    // --- Завантажуємо дані гравця ---
    useEffect(() => {
        if (!userId) return;
        const fetchPlayerData = async () => {
            setIsLoading(true);
            const { data: userData, error: userError } = await supabase
                .from('users').select('level, character_class, points').eq('id', String(userId)).single();
            if (userError) { console.error(userError); /* обробка помилки */ return; }

            const { data: inventoryData, error: inventoryError } = await supabase
                .from("inventory").select("item_id, equipped, upgrade_level").eq("user_id", String(userId));
            if (inventoryError) { console.error(inventoryError); /* обробка помилки */ return; }

            const formattedInventory = inventoryData.map((entry) => {
                const itemDetails = AllItems.find((i) => i.item_id === entry.item_id);
                return itemDetails ? { ...itemDetails, ...entry } : null;
            }).filter(Boolean);

            const playerStats = getPlayerStats(formattedInventory as any[]);
            
            setPlayerData({
                ...userData,
                ...playerStats,
                currentHP: playerStats.health // На початку здоров'я повне
            });
            setIsLoading(false);
        };
        fetchPlayerData();
    }, [userId]);
    

    // --- Формуємо початковий промпт ---
    useEffect(() => {
        if (playerData && chatHistory.length === 0) {
            const initialSystemPrompt = `Act as a dark fantasy RPG dungeon master. Your response must be ONLY a JSON object like {"story": "...", "choices": ["..."], "outcome": ...}.
            The player character is a Level ${playerData.level} ${playerData.character_class} with ${playerData.currentHP}/${playerData.health} HP, ${playerData.attack} ATK, ${playerData.defense} DEF.
            Take their stats into account when generating challenges and describing outcomes. Start the story at a crossroad in a dark forest.`;
            
            const initialHistory = [
                { role: "user", parts: [{ text: initialSystemPrompt }] },
                { role: "model", parts: [{ text: JSON.stringify({ story: "Ти стоїш на роздоріжжі в Темному лісі...", choices: ["Йти на північ", "Йти на схід", "Оглянутись навколо"], outcome: null }) }] }
            ];
            setChatHistory(initialHistory);
            setStory("Ти стоїш на роздоріжжі в Темному лісі...");
            setChoices(["Йти на північ", "Йти на схід", "Оглянутись навколо"]);
        }
    }, [playerData, chatHistory.length]);

    // --- Функція для обробки результату ---
   const processOutcome = useCallback(async (outcome: Outcome) => {
        if (!outcome || !userId || !playerData) return;

        if (outcome.type === 'BATTLE') {
            toast(`На вас напав ${outcome.enemy.name}!`, { icon: '⚔️' });
            setEnemy(outcome.enemy);
            setIsInCombat(true);
            setStory(prevStory => `${prevStory}\n\n**Бій починається!** Перед вами ${outcome.enemy.name} (❤️${outcome.enemy.health}).`);
            setChoices(["🗡️ Атакувати", "🛡️ Захищатись", "🏃 Втекти"]);
            return; // Виходимо, щоб не показувати сповіщення про нагороду
        }
        
        toast.loading('Оновлення прогресу...');
        let successMessage = '';
        
        try {
            if (outcome.type === 'REWARD') {
                const { data: currentUserData, error: fetchError } = await supabase.from('users').select('points, atl_balance').eq('id', String(userId)).single();
                if (fetchError) throw fetchError;
                const currentValue = (currentUserData as any)?.[outcome.item] || 0;
                const newValue = currentValue + outcome.amount;
                const { error } = await supabase.from('users').update({ [outcome.item]: newValue }).eq('id', String(userId));
                if (error) throw error;
                successMessage = `Отримано: ${outcome.amount} ${outcome.item === 'points' ? '🪨' : '🪙'}!`;
            }
            // TODO: Додати логіку для outcome.type === 'ITEM'

            toast.dismiss();
            toast.success(successMessage);
        } catch (error) {
            toast.dismiss();
            toast.error("Помилка збереження прогресу.");
            console.error("Помилка оновлення даних гравця:", error);
        }
    }, [userId, playerData]);

    const handleChoice = useCallback(async (choice: string) => {
        if (chatHistory.length === 0) {toast.error("Історія ще не завантажена."); return;}
        if (!playerData) {toast.error("Дані гравця ще не завантажені."); return;}
        if (isInCombat) {
            if (energy < 1) {
                toast.error("Недостатньо енергії для дії! ⚡");
                return; // Зупиняємо дію, якщо немає енергії
            }
            // Списуємо енергію ПЕРЕД відправкою запиту
            const energySpent = await spendEnergy(1);
            if (!energySpent) {
                toast.error("Не вдалося списати енергію.");
                return; // Зупиняємо, якщо сталася помилка
            }
        }
        setIsLoading(true);

        const promptText = `My character stats: HP ${playerData.currentHP}/${playerData.health}, ATK ${playerData.attack}, DEF ${playerData.defense}. My choice is: "${choice}".`;
        
        const newHistory = [...chatHistory, { role: "user", parts: [{ text: promptText }] }];
        setChatHistory(newHistory);

        const payload = { contents: newHistory };
        const apiKey = "AIzaSyCdfukZL62hI3FBXgHZ-0Aj7iAlZOdWDzc"; // <-- ВАШ КЛЮЧ
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const result = await response.json();

            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const rawText = result.candidates[0].content.parts[0].text;
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
                
                const cleanJsonText = jsonMatch[0];
                const parsedResponse: AIResponse = JSON.parse(cleanJsonText);
                
                setStory(parsedResponse.story);
                setChoices(parsedResponse.choices);
                setChatHistory(prev => [...prev, { role: "model", parts: [{ text: cleanJsonText }] }]);
                
                if (parsedResponse.outcome) {
                    await processOutcome(parsedResponse.outcome);
                } else if (isInCombat) {
                    setIsInCombat(false);
                    setEnemy(null);
                }
            } else {
                throw new Error("Invalid response structure from AI.");
            }
        } catch (error) {
            console.error("Помилка при взаємодії з AI:", error);
            setStory("Темрява згущується... Спробуй зробити інший вибір. (Помилка: " + (error as Error).message + ")");
        } finally {
            setIsLoading(false);
        }
    }, [chatHistory, userId, playerData, isInCombat, enemy, energy, spendEnergy, processOutcome]);

    return (
        <div style={styles.pageContainer}>
            <Toaster position="top-center" />
            {isLoading && (
                <div style={styles.loadingOverlay as React.CSSProperties}><span>Доля вирішується...</span></div>
            )}

            <main style={styles.storyContainer}>
                <div style={styles.storyContent}>
                    <ReactMarkdown>{story}</ReactMarkdown>
                </div>
            </main>
            
            <PlayerStatusBar playerData={playerData} />

            <footer style={styles.actionsContainer}>
                {choices.map((choice, index) => (
                    <button key={index} style={styles.actionButton} onClick={() => handleChoice(choice)} disabled={isLoading || choices.length === 0}>
                        {choice}
                    </button>
                ))}
            </footer>
        </div>
    );
}