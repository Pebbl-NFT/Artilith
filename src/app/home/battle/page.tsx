"use client";

import React, { useEffect } from "react";
import { Button, Link, Progress } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import { useEnergy } from '@/context/EnergyContext';
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";
import { useAdventure, AdventureState } from "@/hooks/useAdventure";
import { AllItems } from "@/components/Item/Items";
import { StageContent } from "@/game/adventureEngine";

// =======================================================================
// ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ
// =======================================================================
export default function BattlePage() {
    const { state, initialize, startEncounter, playerAttack, nextStage, escapeBattle, tickTimer, timeUp, resolveChestEvent } = useAdventure();
    const { spendEnergy, energy } = useEnergy();
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;

    useEffect(() => {
        if (!userId) return;
        const fetchInitialData = async () => {
            const { data: userData, error: userError } = await supabase.from("users").select("current_encounter_number, level").eq("id", String(userId)).single();
            if (userError) { toast.error("Не вдалося завантажити ваш прогрес."); return; }
            
            const { data: inventoryData, error: inventoryError } = await supabase.from("inventory").select("item_id, equipped, upgrade_level").eq("user_id", String(userId));
            if (inventoryError) { toast.error("Не вдалося завантажити інвентар."); return; }

            const formattedInventory = inventoryData.map((entry) => {
                const itemDetails = AllItems.find((i) => i.item_id === entry.item_id);
                if (!itemDetails) return null;
                return { ...itemDetails, ...entry };
            }).filter(Boolean);

            initialize(userData.current_encounter_number || 1, formattedInventory as any[], userData.level || 1);
        };
        fetchInitialData();
    }, [userId, initialize]);

    useEffect(() => {
        if (state.status === 'in_battle' && state.isPlayerTurn) {
            if (state.turnTimer <= 0) { timeUp(); toast.error("Час вийшов! Поразка."); return; }
            const timer = setInterval(tickTimer, 1000);
            return () => clearInterval(timer);
        }
    }, [state.status, state.isPlayerTurn, state.turnTimer, tickTimer, timeUp]);

    const handleStartEncounter = async () => {
        if (state.stageContent?.type === 'battle') {
            if (energy < 1) { toast.error("Недостатньо енергії ⚡"); return; }
            const success = await spendEnergy(1);
            if (success) startEncounter(); else toast.error("Не вдалося списати енергію.");
        } else {
            startEncounter();
        }
    };
    
    const renderContent = () => {
        switch (state.status) {
            case 'loading': return <div style={styles.centerScreen}>Завантаження пригод...</div>;
            case 'pre_stage': return <PreStageScreen state={state} onStart={handleStartEncounter} />;
            case 'in_battle': return <BattleScreen state={state} onAttack={playerAttack} onEscape={escapeBattle} />;
            case 'event': return <EventScreen state={state} onResolve={resolveChestEvent} />;
            case 'post_encounter': return <EncounterResultScreen state={state} onContinue={nextStage} />;
            default: return <div style={styles.centerScreen}>Щось пішло не так...</div>;
        }
    };

    return (
        <Page>
            <Toaster position="top-center" />
            <div style={{ ...styles.background, backgroundImage: `url('/bg/bgforestnght.jpg')` }}>
                {renderContent()}
            </div>
        </Page>
    );
}

// =======================================================================
// ДОПОМІЖНІ КОМПОНЕНТИ (UI)
// =======================================================================
function getEventDetails(content: StageContent) {
    switch (content.type) {
        case 'event_chest':
            return {
                title: 'Таємнича скриня',
                imageSrc: '/enemies/chest1.png',
                message: 'Ви натрапили на стару скриню. Відкрити її чи пройти повз?'
            };
        case 'rest_stop':
            return {
                title: 'Привал',
                imageSrc: '/bg/rest.jpg',
                message: content.data.message
            };
        default:
            return { title: 'Невідома подія', imageSrc: '/events/default.png', message: 'Щось цікаве попереду.'};
    }
}

function StatBar({ value, max, color, icon }: { value: number; max: number; color: string; icon: string; }) {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={styles.barContainer}>
            <div style={styles.barIcon}>{icon}</div>
            <div style={styles.barBackground}>
                <div style={{...styles.barForeground, width: `${percentage}%`, backgroundColor: color }}></div>
            </div>
            <div style={styles.barText}>{value} / {max}</div>
        </div>
    );
}

// --- Екран перед боєм або подією (ВИПРАВЛЕНО) ---
function PreStageScreen({ state, onStart }: { state: AdventureState; onStart: () => void; }) {
    const { stageContent, stageNumber } = state;
    if (!stageContent) return <div style={styles.centerScreen}>Генерація етапу...</div>;

    // --- ЗМІНА: Тепер цей компонент обробляє ВСІ типи подій, а не тільки бій ---
    if (stageContent.type === 'battle') {
        const enemy = stageContent.data;
        return (
            <div style={styles.preBattleContainer}>
                <div style={styles.stageTitle}>Етап {stageNumber}</div>
                <div style={styles.enemyShowcase}>
                    <h1 style={styles.enemyName}>{enemy.name}</h1>
                    <div style={styles.enemyImageContainer}>
                        <Image src={enemy.image} alt={enemy.name} width={200} height={200} style={{ zIndex: 1 }} />
                        <div style={styles.enemyShadow}></div>
                    </div>
                    <div style={styles.enemyStatsContainer}>
                        <span style={styles.statPill}>❤️ {enemy.maxHealth}</span>
                        <span style={styles.statPill}>🗡️ {enemy.damage}</span>
                        <span style={styles.statPill}>🛡️ {enemy.defense}</span>
                    </div>
                </div>
                <div style={styles.preBattleActions}>
                    <Button size="l" onClick={onStart} style={styles.mainActionButton}>⚔️ Почати бій (-1⚡) ⚔️</Button>
                </div>
            </div>
        );
    }
    
    // Відображення для інших подій (скриня, відпочинок)
    const { title, imageSrc, message } = getEventDetails(stageContent);
    return (
        <div style={styles.preBattleContainer}>
            <div style={styles.stageTitle}>Етап {stageNumber}</div>
             <div style={styles.enemyShowcase}>
                <h1 style={styles.enemyName}>{title}</h1>
                <div style={styles.enemyImageContainer}>
                    <Image src={imageSrc} alt={title} width={200} height={200} style={{ zIndex: 1 }} />
                    <div style={styles.enemyShadow}></div>
                </div>
                <p style={{ maxWidth: '300px', textAlign: 'center', marginTop: '20px' }}>{message}</p>
             </div>
            <div style={styles.preBattleActions}>
                <Button size="l" onClick={onStart} style={styles.mainActionButton}>Продовжити</Button>
            </div>
        </div>
    );
}

function BattleScreen({ state, onAttack, onEscape }: { state: AdventureState; onAttack: () => void; onEscape: () => void; }) {
    const { player, enemy, turnTimer } = state;
    if (!enemy.stats) return null;

    return (
        <div style={styles.battleContainer}>
            <div style={styles.turnTimerContainer}>
                <Progress value={(turnTimer / 15) * 100} style={{ color: '#fbbf24', backgroundColor: '#372a0f', height: '8px' }} />
            </div>
            <div style={{ ...styles.characterBlock, flex: 1, justifyContent: 'center' }}>
                <h2>{enemy.stats.name}</h2>
                <Image src={enemy.stats.image} alt={enemy.stats.name} width={160} height={160} style={{ margin: '10px 0' }} />
                <StatBar value={enemy.currentHP} max={enemy.stats.maxHealth} color="#e53e3e" icon="❤️" />
                <StatBar value={enemy.currentDEF} max={enemy.stats.defense} color="#4299e1" icon="🛡️"/>
            </div>
            <div style={styles.actionsBlock}>
                <Button size="l" onClick={onAttack} style={styles.actionButton}>🗡️ Атакувати</Button>
                <Button size="m" mode="outline" onClick={onEscape} style={{...styles.actionButton}}>Втекти</Button>
            </div>
            <div style={styles.characterBlock}>
                 <h2 style={{marginTop: '10px'}}>Ваші характеристики</h2>
                 <StatBar value={player.currentHP} max={player.stats.health} color="#48bb78" icon="❤️" />
                 <StatBar value={player.currentDEF} max={player.stats.defense} color="#4299e1" icon="🛡️"/>
                <div style={styles.statsRow}>
                    <span>🗡️ {player.stats.attack}</span>
                </div>
            </div>
        </div>
    );
}

function EncounterResultScreen({ state, onContinue }: { state: AdventureState; onContinue: () => void; }) {
    const { encounterResult } = state;
    if (!encounterResult) return null;

    let title = '', icon = '', message = '', buttonText = 'Далі';

    switch (encounterResult.type) {
        case 'battle':
            title = encounterResult.result === 'win' ? 'Перемога!' : 'Поразка...';
            icon = encounterResult.result === 'win' ? '🎊' : '💀';
            message = encounterResult.result === 'win' ? 'Ви перемогли ворога!' : 'Вас перемогли...';
            buttonText = encounterResult.result === 'win' ? 'Наступний етап' : 'Спробувати знову';
            break;
        case 'event_reward':
            title = 'Скарб!';
            icon = '💎';
            message = `Ви знайшли: ${encounterResult.reward.points} 🪨 та ${encounterResult.reward.atl} 🪙!`;
            buttonText = 'Чудово!';
            break;
        case 'event_leave':
            title = 'Подорож триває';
            icon = '👣';
            message = 'Ви вирішили не ризикувати і пішли далі.';
            break;
    }

    return (
        <div style={styles.resultOverlay}>
            <div style={styles.resultCard}>
                <h1 style={{fontSize: '3.5em', margin: 0}}>{icon}</h1>
                <h2 style={{fontSize: '2.2em', margin: '10px 0'}}>{title}</h2>
                <p style={{color: '#c7d2fe', fontSize: '1.1em'}}>{message}</p>
                <Button size="l" onClick={onContinue} style={{ marginTop: '30px', width: '220px' }}>
                    {buttonText}
                </Button>
            </div>
        </div>
    );
}

function EventScreen({ state, onResolve }: { state: AdventureState; onResolve: (choice: 'open' | 'leave') => void; }) {
     if (!state.stageContent || state.stageContent.type === 'battle') return null;
     
    const { title, imageSrc, message } = getEventDetails(state.stageContent);

     return (
        <div style={styles.centerScreenColumn}>
            <h1>{title}</h1>
            <Image src={imageSrc} alt="Подія" width={160} height={160} style={{ margin: '20px 0' }} />
            <p style={{ maxWidth: '300px' }}>{message}</p>
            
            {state.stageContent.type === 'event_chest' ? (
                <div style={styles.actionsBlock}>
                    <Button size="l" style={styles.actionButton} onClick={() => onResolve('open')}>Відкрити скриню</Button>
                    <Button size="m" mode="outline" style={styles.actionButton} onClick={() => onResolve('leave')}>Піти далі</Button>
                </div>
            ) : (
                 <Button size="l" onClick={() => onResolve('leave')} style={{ marginTop: '30px', width: '220px' }}>Далі</Button>
            )}
        </div>
     );
}

// =======================================================================
// СТИЛІ
// =======================================================================
const styles: { [key: string]: React.CSSProperties } = {
    background: { width: '100%', minHeight: '100vh', color: '#fff', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column' },
    centerScreen: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' },
    centerScreenColumn: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' },
    preBattleContainer: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '20px', paddingTop: '40px' },
    stageTitle: { fontSize: '18px', color: '#a0aec0', fontWeight: '600' },
    enemyShowcase: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
    enemyName: { fontSize: '28px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: '10px 0' },
    enemyImageContainer: { position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0' },
    enemyShadow: { position: 'absolute', bottom: '10px', width: '150px', height: '30px', background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 30%, transparent 70%)', borderRadius: '50%', zIndex: 0 },
    enemyStatsContainer: { display: 'flex', gap: '10px', marginTop: '20px' },
    statPill: { background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', border: '1px solid rgba(255,255,255,0.1)' },
    preBattleActions: { width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '20px' },
    mainActionButton: { width: '240px', fontSize: '18px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.3)' },
    battleContainer: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '50px 0 20px 0', position: 'relative' },
    characterBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' },
    turnTimerContainer: { position: 'absolute', top: '10px', width: '90%', maxWidth: '400px' },
    barContainer: { display: 'flex', alignItems: 'center', width: '220px', gap: '8px', margin: '2px 0' },
    barIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
    barBackground: { flex: 1, height: '14px', backgroundColor: '#2d3748', borderRadius: '7px', overflow: 'hidden', border: '1px solid #4a5568'},
    barForeground: { height: '100%', borderRadius: '7px', transition: 'width 0.3s ease-out' },
    barText: { fontSize: '11px', minWidth: '55px', textAlign: 'center', color: '#a0aec0', fontFamily: 'monospace' },
    actionsBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '16px 0' },
    actionButton: { width: '180px' },
    resultOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 20, 40, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, animation: 'fadeIn 0.3s ease-out' },
    resultCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 40px', background: 'linear-gradient(145deg, #2c2c54, #1a1a3d)', borderRadius: '20px', border: '1px solid rgba(129, 140, 248, 0.3)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', color: '#e0e7ff' }
};
