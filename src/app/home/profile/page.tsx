'use client';

import React, { useEffect, useState, CSSProperties } from "react";
import Image from 'next/image';
import { Placeholder, Card, Progress } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import { useEnergy } from '@/context/EnergyContext';
import { getRequiredExp } from "@/utils/experience";
import { calculateVipLevel } from "@/utils/vip";
import { useRouter } from 'next/navigation';
import TopBar from "@/components/TopBar";

export default function ProfilePage() {
    const router = useRouter();
    const { energy } = useEnergy(); 
    const initDataState = useSignal(initData.state);
    const user = initDataState?.user;
    const userId = user?.id;
    const userName = user?.firstName || "Anonymous";
    const userAvatar = user?.photoUrl;

    const [userData, setUserData] = useState({
        points: 0,
        level: 1,
        experience: 0,
        ton_balance: 0,
        atl_balance: 0,
        total_wins: 0,
        created_at: new Date().toISOString(),
        character_class: '',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from("users")
                .select("points, level, experience, ton_balance, atl_balance, total_wins, created_at, character_class")
                .eq("id", String(userId))
                .single();

            if (data) setUserData(data);
            if (error) console.error("Помилка отримання даних профілю:", error);
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    const requiredExpForNextLevel = getRequiredExp(userData.level);
    const xpProgress = requiredExpForNextLevel > 0 ? (userData.experience / requiredExpForNextLevel) * 100 : 0;
    const vipData = calculateVipLevel(userData.atl_balance);

    if (loading) {
        return <Page><Placeholder>Завантаження профілю...</Placeholder></Page>;
    }

    return (
        <Page>
            <TopBar 
                points={userData.points} 
                atl_balance={userData.atl_balance} 
                ton_balance={userData.ton_balance} 
            />
            
            <div style={styles.container}>
                <div style={{ textAlign: 'center', animation: "fadeIn 0.5s ease forwards", marginBottom: '20px' }}>
                    {userAvatar && <img src={userAvatar} alt="avatar" style={styles.avatar} />}
                    <h1 style={styles.userName}>{userName}</h1>
                    <p style={styles.classText}>{userData.character_class}</p>
                    <p style={styles.levelText}>Рівень {userData.level}</p>
                    <div style={{maxWidth: '200px', margin: '10px auto'}}>
                       <Progress style={{ color: '#8774e1' }} value={xpProgress} />
                    </div>
                    <p style={styles.xpText}>{Math.floor(userData.experience)} / {requiredExpForNextLevel} 🔷</p>
                </div>

                {/* 2. Видаляємо className="page" */}
                <Card style={{ ...styles.card, border: '1px solid rgba(255, 208, 0, 0.81)' }}>
                    <div>
                        <p style={styles.cardSubtitle}>VIP Рівень {vipData.level}</p>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                        <Progress style={{ color: 'rgba(255, 208, 0, 0.81)' }} value={vipData.progress} />
                        <p style={styles.xpText}>
                            {vipData.currentATL.toFixed(2)} / {vipData.nextLevelATL} 
                            <Image src="/coin/atl_g.png" alt="ATL" width={12} height={12} style={{margin: '0 5px'}} />
                             до наступного рівня VIP
                        </p>
                    </div>
                </Card>

                <Card style={styles.card}>
                    <h3 style={styles.cardTitle}>Статистика</h3>
                    <div style={styles.statsContainer}>
                        <p style={styles.statRow}>
                            <span style={styles.statLabel}><Image src="/coin/atl_s.png" alt="Points" width={16} height={16} /> Уламки</span> 
                            <span style={styles.statValue}>{Math.floor(userData.points)}</span>
                        </p>
                        <p style={styles.statRow}>
                            <span style={styles.statLabel}><Image src="/coin/atl_g.png" alt="ATL" width={16} height={16} /> $ATL</span> 
                            <span style={styles.statValue}>{userData.atl_balance.toFixed(4)}</span>
                        </p>
                        <p style={styles.statRow}>
                            <span style={styles.statLabel}>💎 TON</span> 
                            <span style={styles.statValue}>{userData.ton_balance.toFixed(4)}</span>
                        </p>
                        <p style={styles.statRow}>
                            <span style={styles.statLabel}>⚡ Енергія</span> 
                            <span style={styles.statValue}>{energy}</span>
                        </p>
                        {userData.created_at && (
                            <p style={styles.statRow}>
                                <span style={styles.statLabel}>📅 В грі з</span> 
                                <span style={styles.statValue}>{new Date(userData.created_at).toLocaleDateString()}</span>
                            </p>
                        )}
                    </div>
                </Card>

                <Card style={styles.card}>
                    <h3 style={styles.cardTitle}>Досягнення</h3>
                    <div style={styles.achievements}>
                        <Achievement value={String(userData.total_wins)} label="Перемоги" color="#00ffcc" />
                    </div>
                </Card>
            </div>
            
            <div style={styles.backButtonContainer} onClick={() => router.push('/home')}>
                <p style={{ fontSize: "16px", color: "#fff", fontWeight: "bold", margin: 0 }}>
                    👈 Назад
                </p>
            </div>
        </Page>
    );
}

function Achievement({ value, label, color }: { value: string; label: string; color: string; }) {
    return (
        <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "24px", color, fontWeight: 'bold' }}>{value}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{label}</p>
        </div>
    );
} 

// --- ОНОВЛЕНИЙ БЛОК СТИЛІВ ---
const styles: { [key: string]: CSSProperties } = {
    container: { 
        padding: "80px 15px 80px 15px",
        minHeight: "100vh", 
        color: "#fff", 
        display: "flex", 
        flexDirection: "column", 
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
    },
    avatar: { borderRadius: "50%", width: 80, height: 80, border: "2px solid #888", marginBottom: '10px' },
    // 1. Додано відступи для кращої читабельності
    userName: { margin: '0 0 5px 0', color: "#fff", fontSize: "24px", fontWeight: 'bold' },
    classText: { color: "#a7b3d9", fontSize: "14px", margin: '5px 0', fontWeight: 'bold', textTransform: 'uppercase' },
    levelText: { color: "#ccc", fontSize: "16px", display: "flex", justifyContent: 'center', margin: '5px 0 0 0' },

    xpText: { fontSize: "12px", color: "rgba(167, 167, 167, 0.81)", marginTop: "8px", display: "flex", justifyContent: 'center', alignItems: 'center' },
    
    // 2. Виносимо спільні стилі для карток сюди
    card: {
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box',
    },
    cardTitle: { marginBottom: "16px", width: "100%", textAlign: "center", fontSize: "18px", color: "#fff", borderBottom: '1px solid #444', paddingBottom: '10px' },
    cardSubtitle: { color: "#ccc", fontSize: "14px", display: "flex", justifyContent: 'center', margin: 0 },

    statsContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
    statRow: { padding: "10px 5px", display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', margin: 0, },
    statLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: "#ccc", fontSize: "14px" },
    statValue: { color: "#fff", fontSize: "14px", fontWeight: 'bold', fontFamily: 'monospace' },

    achievements: { display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "space-around" },
    backButtonContainer: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px', background: 'rgba(18, 16, 21, 0.8)', backdropFilter: 'blur(5px)', zIndex: 150, cursor: 'pointer', borderTop: '1px solid #444' },
};