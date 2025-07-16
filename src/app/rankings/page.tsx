"use client";
import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Placeholder, List } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useRouter } from 'next/navigation';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { toast, Toaster } from 'react-hot-toast';

import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';

// --- Типи ---
type RankedUser = {
  id: string;
  first_name: string | null;
  level: number;
};

type RankingTab = 'level' | 'points' | 'glory';

// --- Стилі (залишаються без змін) ---
const styles: { [key: string]: CSSProperties } = {
  pageContainer: {
    minHeight: '100vh',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    color: '#e0e7ff',
    fontFamily: "'Spectral', serif",
  },
  contentWrapper: {
    padding: '70px 15px 100px 15px',
  },
  title: {
    fontFamily: "'Cinzel', serif'",
    textAlign: 'center',
    fontSize: 'clamp(1.8rem, 6vw, 2.2rem)',
    marginBottom: '20px',
    color: '#fefce8',
    textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)',
  },
  tabSwitcher: {
    display: 'flex',
    marginBottom: '20px',
    background: 'rgba(10, 5, 20, 0.5)',
    borderRadius: '12px',
    padding: '5px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
  },
  tabButton: {
    flex: 1,
    padding: '10px 5px',
    background: 'transparent',
    border: 'none',
    color: '#a7b3d9',
    fontSize: 'clamp(0.9rem, 4vw, 1rem)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '8px',
    fontWeight: 'bold',
  },
  activeTabButton: {
    background: 'rgba(129, 140, 248, 0.2)',
    color: '#fefce8',
    boxShadow: 'inset 0 0 10px rgba(129, 140, 248, 0.3)',
  },
  listContainer: {
    padding: '15px',
    background: 'rgba(10, 5, 20, 0.6)',
    backdropFilter: 'blur(5px)',
    borderRadius: '12px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
    minHeight: '400px',
  },
  rankingList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 10px',
    marginBottom: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'background-color 0.2s ease',
  },
  rankPosition: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fefce8',
    width: '40px',
    flexShrink: 0,
    textAlign: 'center',
  },
  rankName: {
    flexGrow: 1,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#e0e7ff',
    padding: '0 10px',
  },
  rankLevel: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#a7b3d9',
    display: 'flex',
    alignItems: 'center',
    gap: '8px', // Трохи збільшимо відступ
  },
};

// --- НОВА ФУНКЦІЯ для вибору іконки ---
const getRankIcon = (rankIndex: number): string => {
    // rankIndex починається з 0, тому Топ-1 має індекс 0
    if (rankIndex === 0) {
        return '/icons/wing_epic.png'; // Топ 1
    }
    if (rankIndex === 1 || rankIndex === 2) {
        return '/icons/wing_rare.png'; // Топ 2-3
    }
    if (rankIndex >= 3 && rankIndex <= 8) {
        return '/icons/wing_common.png'; // Топ 4-9
    }
    // Для всіх інших гравців повертаємо стандартну іконку
    return '/coin/atl_s.png';
};


export default function RankingsPage() {
    const router = useRouter();
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;

    const [rankings, setRankings] = useState<RankedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<RankingTab>('level');
    const [balances, setBalances] = useState({ points: 0, atl_balance: 0, ton_balance: 0 });

    const loadRankings = useCallback(async () => {
        setLoading(true);
        if (activeTab === 'level') {
            const { data, error } = await supabase
                .from('users')
                .select('id, first_name, level')
                .order('level', { ascending: false })
                .limit(100);

            if (error) {
                toast.error("Не вдалося завантажити рейтинг.");
            } else {
                setRankings(data as RankedUser[]);
            }
        }
        setLoading(false);
    }, [activeTab]);

    useEffect(() => {
        const fetchUserBalances = async () => {
            if (!userId) return;
            const { data: userData } = await supabase
                .from('users').select('points, atl_balance, ton_balance')
                .eq('id', String(userId)).single();
            if (userData) setBalances(userData as any);
        };
        fetchUserBalances();
    }, [userId]);

    useEffect(() => { loadRankings(); }, [loadRankings]);

    return (
        <Page>
            <div style={styles.pageContainer}>
                <List>
                    <TopBar points={balances.points} atl_balance={balances.atl_balance} ton_balance={balances.ton_balance} />
                    <div style={styles.contentWrapper}> 
                        <h2 style={styles.title}>Алея Героїв</h2>
                        
                        <div style={styles.tabSwitcher}>
                            <button style={{ ...styles.tabButton, ...(activeTab === 'level' ? styles.activeTabButton : {}) }} onClick={() => setActiveTab('level')}>Рівень</button>
                            <button style={{ ...styles.tabButton }} onClick={() => toast('Рейтинг за пройденими етапами ще в розробці!')}>Етапи</button>
                            <button style={{ ...styles.tabButton }} onClick={() => toast('Рейтинг за багатством ще в розробці!')}>Багатство</button>
                        </div>
                        
                        <div style={styles.listContainer}>
                            {loading ? (
                                <Placeholder>Завантаження героїв...</Placeholder>
                            ) : (
                                <ul style={styles.rankingList}>
                                    {rankings.length > 0 ? (
                                        rankings.map((user, index) => (
                                            <li key={user.id} style={styles.rankingItem}>
                                                <div style={styles.rankPosition}>#{index + 1}</div>
                                                <div style={styles.rankName}>{user.first_name || 'Невідомий герой'}</div>
                                                <div style={styles.rankLevel}>
                                                    <span>{user.level}</span>
                                                    {/* ОНОВЛЕНО: Викликаємо функцію для отримання іконки */}
                                                    <img src={getRankIcon(index)} alt="rank icon" width={28} height={28} />
                                                </div>
                                            </li>
                                        ))
                                    ) : (
                                        <Placeholder>Героїв ще немає в цій залі.</Placeholder>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                </List>
            </div>
            <Toaster position="top-center" reverseOrder={false} />
            <BottomBar activeTab={"city"} setActiveTab={() => router.push('/home')} />
        </Page>
    );
};