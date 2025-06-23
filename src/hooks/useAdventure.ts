// src/hooks/useAdventure.ts
import { useReducer, useCallback } from 'react';
import { generateStage, StageContent, Enemy } from '@/game/adventureEngine';
import { getPlayerStats } from '@/utils/getPlayerStats';

// --- 1. ОНОВЛЕННЯ СТАНІВ ТА ДІЙ ---
type AdventureStatus = 'loading' | 'pre_stage' | 'in_battle' | 'event' | 'post_encounter';

type EncounterResult = 
    | { type: 'battle'; result: 'win' | 'lose' }
    | { type: 'event_reward'; reward: { points: number; atl: number; } }
    | { type: 'event_leave' };

export interface AdventureState {
    status: AdventureStatus;
    stageNumber: number;
    player: {
        stats: { health: number; attack: number; defense: number; };
        currentHP: number;
        currentDEF: number;
    };
    stageContent: StageContent | null;
    enemy: {
        stats: Enemy | null;
        currentHP: number;
        currentDEF: number;
    };
    turnTimer: number;
    isPlayerTurn: boolean;
    encounterResult: EncounterResult | null;
}

type AdventureAction =
    | { type: 'INITIALIZE'; payload: { stageNumber: number; inventory: any[]; playerLevel: number; } }
    | { type: 'START_ENCOUNTER' }
    | { type: 'PLAYER_ATTACK' }
    | { type: 'TICK_TIMER' }
    | { type: 'TIME_UP' }
    | { type: 'ESCAPE_BATTLE' }
    | { type: 'RESOLVE_CHEST_EVENT'; payload: { choice: 'open' | 'leave' } }
    | { type: 'NEXT_STAGE' };

// --- 2. ОНОВЛЕНИЙ РЕДЬЮСЕР ---
const MIMIC_ENEMY_TEMPLATE: Enemy = {
    name: 'Мімік!',
    image: '/enemies/special/mimic1.png',
    type: 'miniBoss',
    maxHealth: 150,
    damage: 15,
    defense: 10,
    critChance: 0.15,
    missChance: 0.05,
};

function calculateDamage(damage: number, defense: number, health: number) {
    const damageToDefense = Math.min(defense, damage);
    const newDefense = defense - damageToDefense;
    const damageThrough = damage - damageToDefense;
    const newHealth = health - damageThrough;
    return { newDefense, newHealth, totalDamage: damage };
}

function adventureReducer(state: AdventureState, action: AdventureAction): AdventureState {
    switch (action.type) {
        case 'INITIALIZE': {
            const playerStats = getPlayerStats(action.payload.inventory);
            return {
                ...state,
                status: 'pre_stage',
                stageNumber: action.payload.stageNumber,
                player: {
                    stats: playerStats,
                    currentHP: playerStats.health,
                    currentDEF: playerStats.defense,
                },
                stageContent: generateStage(action.payload.stageNumber, action.payload.playerLevel),
            };
        }
        case 'START_ENCOUNTER': {
            if (state.stageContent?.type === 'battle') {
                const enemyStats = state.stageContent.data;
                return {
                    ...state,
                    status: 'in_battle',
                    isPlayerTurn: true,
                    turnTimer: 15,
                    enemy: { stats: enemyStats, currentHP: enemyStats.maxHealth, currentDEF: enemyStats.defense },
                    encounterResult: null,
                };
            }
            return { ...state, status: 'event' };
        }
        case 'PLAYER_ATTACK': {
            if (state.status !== 'in_battle' || !state.enemy.stats || !state.isPlayerTurn) return state;
            
            const playerAttackResult = calculateDamage(state.player.stats.attack, state.enemy.currentDEF, state.enemy.currentHP);
            if (playerAttackResult.newHealth <= 0) {
                return { ...state, status: 'post_encounter', encounterResult: { type: 'battle', result: 'win' }, enemy: { ...state.enemy, currentHP: 0 } };
            }
            
            const newState = { ...state, isPlayerTurn: false, enemy: { ...state.enemy, currentHP: playerAttackResult.newHealth, currentDEF: playerAttackResult.newDefense } };
            
            if (!newState.enemy.stats) return newState;
            const enemyAttackResult = calculateDamage(newState.enemy.stats.damage, newState.player.currentDEF, newState.player.currentHP);
            if (enemyAttackResult.newHealth <= 0) {
                return { ...newState, status: 'post_encounter', encounterResult: { type: 'battle', result: 'lose' }, player: { ...newState.player, currentHP: 0 } };
            }

            return {
                ...newState,
                isPlayerTurn: true,
                turnTimer: 15,
                player: { ...newState.player, currentHP: enemyAttackResult.newHealth, currentDEF: enemyAttackResult.newDefense },
            };
        }
        case 'TICK_TIMER': {
            if (state.status !== 'in_battle' || !state.isPlayerTurn) return state;
            return { ...state, turnTimer: Math.max(0, state.turnTimer - 1) };
        }
        case 'TIME_UP': return { ...state, status: 'post_encounter', encounterResult: { type: 'battle', result: 'lose' } };
        case 'ESCAPE_BATTLE': return { ...state, status: 'post_encounter', encounterResult: { type: 'battle', result: 'lose' } };
        
        case 'RESOLVE_CHEST_EVENT': {
            if (action.payload.choice === 'leave') {
                return { ...state, status: 'post_encounter', encounterResult: { type: 'event_leave' } };
            }
            if (Math.random() < 0.5) {
                return {
                    ...state,
                    status: 'pre_stage',
                    stageContent: { type: 'battle', data: MIMIC_ENEMY_TEMPLATE }
                };
            } else {
                const reward = { points: Math.floor(Math.random() * 100) + 50, atl: parseFloat(((Math.random() * 0.5) + 0.1).toFixed(4)) };
                return { ...state, status: 'post_encounter', encounterResult: { type: 'event_reward', reward } };
            }
        }
        
        case 'NEXT_STAGE': {
            const isSuccess = !state.encounterResult || (state.encounterResult.type === 'battle' && state.encounterResult.result === 'win') || state.encounterResult.type !== 'battle';
            const nextStageNumber = isSuccess ? state.stageNumber + 1 : 1;
            return {
                ...state,
                status: 'pre_stage',
                stageNumber: nextStageNumber,
                player: { ...state.player, currentHP: state.player.stats.health, currentDEF: state.player.stats.defense },
                stageContent: generateStage(nextStageNumber, 1),
                encounterResult: null,
            };
        }
        default: return state;
    }
}

// --- 3. КАСТОМНИЙ ХУК ---
export function useAdventure() {
    const initialState: AdventureState = {
        status: 'loading', stageNumber: 1,
        player: { stats: { health: 20, attack: 1, defense: 0 }, currentHP: 20, currentDEF: 0 },
        stageContent: null,
        enemy: { stats: null, currentHP: 0, currentDEF: 0 },
        turnTimer: 15, isPlayerTurn: false, encounterResult: null,
    };

    const [state, dispatch] = useReducer(adventureReducer, initialState);

    const initialize = useCallback((stageNumber: number, inventory: any[], playerLevel: number) => dispatch({ type: 'INITIALIZE', payload: { stageNumber, inventory, playerLevel } }), []);
    const startEncounter = useCallback(() => dispatch({ type: 'START_ENCOUNTER' }), []);
    const playerAttack = useCallback(() => dispatch({ type: 'PLAYER_ATTACK' }), []);
    const nextStage = useCallback(() => dispatch({ type: 'NEXT_STAGE' }), []);
    const escapeBattle = useCallback(() => dispatch({ type: 'ESCAPE_BATTLE' }), []);
    const tickTimer = useCallback(() => dispatch({ type: 'TICK_TIMER' }), []);
    const timeUp = useCallback(() => dispatch({ type: 'TIME_UP' }), []);
    const resolveChestEvent = useCallback((choice: 'open' | 'leave') => dispatch({ type: 'RESOLVE_CHEST_EVENT', payload: { choice } }), []);

    return { state, initialize, startEncounter, playerAttack, nextStage, escapeBattle, tickTimer, timeUp, resolveChestEvent };
}
