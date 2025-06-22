"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { Link, Placeholder } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { Progress, Card } from "@telegram-apps/telegram-ui";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import { useEnergy } from '@/context/EnergyContext'; // <-- ЗМІНА: Наш глобальний хук енергії
import { getRequiredExp } from "@/utils/experience"; // <-- ЗМІНА: Функція для розрахунку XP
import { calculateVipLevel } from "@/utils/vip"; // <-- ЗМІНА: Наша нова функція для VIP

export default function ProfilePage() {
    // --- ЗМІНА: Підключення до глобального стану енергії ---
    const { energy } = useEnergy(); 
    
    const initDataState = useSignal(initData.state);
    const user = initDataState?.user;
    const userId = user?.id;
    const userName = user?.firstName || "Anonymous";
    const userAvatar = user?.photoUrl;

    // --- ЗМІНА: Розширено стан для зберігання всіх даних ---
    const [userData, setUserData] = useState({
        points: 0,
        level: 1,
        experience: 0,
        ton_balance: 0,
        atl_balance: 0,
        total_wins: 0,
        created_at: new Date().toISOString(),
    });

    // --- ЗМІНА: Завантажуємо всі необхідні дані одним запитом ---
    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            const { data, error } = await supabase
                .from("users")
                .select("points, level, experience, ton_balance, atl_balance, total_wins, created_at")
                .eq("id", String(userId))
                .single();

            if (data) setUserData(data);
            if (error) console.error("Помилка отримання даних профілю:", error);
        };
        fetchData();
    }, [userId]);

    // --- ЗМІНА: Динамічний розрахунок рівнів ---
    const requiredExpForNextLevel = getRequiredExp(userData.level);
    const xpProgress = requiredExpForNextLevel > 0 ? (userData.experience / requiredExpForNextLevel) * 100 : 0;
    const vipData = calculateVipLevel(userData.atl_balance);

    return (
        <Page back>
          <Placeholder>
                <div style={{ textAlign: 'center', animation: "fadeIn 0.5s ease forwards", marginBottom: '20px', width: '50%' }}>
                    {userAvatar && <img src={userAvatar} alt="avatar" style={styles.avatar} />}
                    <h1 style={styles.userName}>{userName}</h1>
                    <p style={{ ...styles.levelText, fontSize: '16px', justifyContent: 'center', marginTop:"20px" }}>Рівень {userData.level}</p>
                    <Progress style={{ color: '#8774e1' }} value={xpProgress} />
                    <p style={styles.xpText}>{userData.experience} / {requiredExpForNextLevel} 🔷</p>
                </div>

                {/* --- ЗМІНА: Картка VIP-рівня --- */}
                <Card className="page" style={{ padding: "20px", border: '1px solid rgba(255, 208, 0, 0.81)', animation: "fadeIn 0.7s ease forwards", }}>
                    <div>
                        <p style={styles.levelText}>VIP Рівень {vipData.level}</p>
                    </div>
                    <div style={{ marginTop: "12px", width: "90%" }}>
                        <Progress style={{ color: 'rgba(255, 208, 0, 0.81)' }} value={vipData.progress} />
                        <p style={styles.xpText}>
                            {vipData.currentATL.toFixed(2)} / {vipData.nextLevelATL} 🪙 до наступного рівня VIP
                        </p>
                    </div>
                </Card>

                {/* --- ЗМІНА: Картка статистики з реальними даними --- */}
                <Card className="page">
                    <h3 style={styles.cardTitle}>Статистика</h3>
                    <p style={styles.statText}>🪨 <strong>{userData.points}</strong> уламків</p>
                    <p style={styles.statText}>🪙 <strong>{userData.atl_balance.toFixed(4)}</strong> $ATL</p>
                    <p style={styles.statText}>💎 <strong>{userData.ton_balance.toFixed(4)}</strong> TON</p>
                    <p style={styles.statText}>⚡ <strong>{energy}</strong> Енергія</p>
                    {userData.created_at && (
                        <p style={styles.statText}>📅 В грі з {new Date(userData.created_at).toLocaleDateString()}</p>
                    )}
                </Card>

                {/* --- ЗМІНА: Картка досягнень з реальними даними --- */}
                <Card className="page">
                    <h3 style={styles.cardTitle}>Досягнення</h3>
                    <div style={styles.achievements}>
                        <Achievement value={String(userData.total_wins)} label="Перемоги" color="#00ffcc" />
                        {/* Тут можна додати інші досягнення */}
                    </div>
                </Card>
            </Placeholder>
            <Link href="/home"
            style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: 40,
                    position: 'fixed',
                    bottom: 0,
                    left: 0, // Додано для повного розтягування
                    background: 'rgba(32, 32, 32, 0)',
                    zIndex: 150,
                    border: 'none', // Прибираємо рамки, якщо вони є
                    borderRadius: 0 // Прибираємо заокруглення, якщо вони є
                }}
                >


                <p style={{ fontSize: "16px", color: "#fff", fontWeight: "bold", margin: 0 }}>
                    👈 Назад
                </p>
        </Link>
        </Page>
    );
}

// Функція-компонент для досягнень залишається без змін
function Achievement({ value, label, color }: { value: string; label: string; color: string; }) {
    return (
        <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "16px", color }}>{value}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{label}</p>
        </div>
    );
} 

// Об'єкт стилів залишається без змін
const styles: { [key: string]: CSSProperties } = {
    container: { padding: "20px", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column", gap: '16px' },
    avatar: { borderRadius: "50%", width: 80, height: 80, border: "2px solid #888", marginBottom: '10px' },
    userName: { margin: 0, color: "#fff", fontSize: "24px", fontWeight: 'bold' },
    levelText: { color: "rgba(255, 208, 0, 0.81)", fontSize: "14px", display: "flex", margin: 0 },
    xpText: { fontSize: "12px", color: "rgba(167, 167, 167, 0.81)", marginTop: "8px", display: "flex", justifyContent: 'center' },
    cardTitle: { marginBottom: "16px", width: "100%", textAlign: "center", fontSize: "18px", color: "#fff" },
    achievements: { display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "space-around" },
    statText: { padding: "8px 0", color: "#ccc", fontSize: "14px", fontFamily: "monospace", display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333' },
};