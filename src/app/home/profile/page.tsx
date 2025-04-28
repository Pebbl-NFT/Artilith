"use client";

import React, { useEffect, useState } from "react";
import { Button, Link, Placeholder, Image  } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { Progress, Card } from "@telegram-apps/telegram-ui";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";
import artilithLogo from "../_assets/Artilith_logo-no-bg.png";

export default function ProfilePage() {
  const initDataState = useSignal(initData.state);
  const user = initDataState?.user;
  const userId = user?.id;
  const userName = user?.firstName || "Anonymous";
  const userAvatar = user?.photoUrl;

  const [userData, setUserData] = useState<{
    points: number;
    click_delay: number;
    created_at?: string;
  }>({ points: 0, click_delay: 1000 });

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) setUserData(data);
      if (error) console.error("Помилка отримання даних:", error);
    };

    fetchData();
  }, [userId]);

  const level = Math.floor(userData.points / 1000);
  const nextLevelProgress = userData.points % 1000;

  return (
    <Page back>
      <div style={styles.container}>
        <Placeholder>
        <h1
            style={{
                fontSize: "3rem",
                fontWeight: "bold",
                marginTop: "20px",
                textAlign: "center",
                lineHeight: "1",
                color: "#fff",
            }}
            >
            {userName}
        </h1>
        <div style={styles.profileHeader}>
          {userAvatar && (
            <img src={userAvatar} alt="avatar" style={styles.avatar} />
          )}
          <div>
            <p style={styles.levelText}>Рівень {level}</p>
          </div>
        </div>

        <div style={{ marginTop: "12px", width: "100%" }}>
          <Progress value={(nextLevelProgress / 1000) * 100} />
          <p style={styles.xpText}>{1000 - nextLevelProgress} Очок досвіду до наступного рівня</p>
        </div>

        <Card className="page">
          <h3 style={styles.cardTitle}>Статистика</h3>
          <p style={styles.statText}>
          🪨 <strong>{userData.points}</strong> Уламки
          </p>
          <p style={styles.statText}>
          🪙 <strong>0</strong> $ATL
          </p>
          <p style={styles.statText}>
          💎 <strong>0</strong> TON
          </p>
          <p style={styles.statText}>
            ⏱️ <strong>{userData.click_delay}</strong> с. на клік
          </p>
          {userData.created_at && (
            <p style={styles.statText}>
              📅 Joined {new Date(userData.created_at).toLocaleDateString()}
            </p>
          )}
        </Card>

        <Card className="page">
          <h3 style={styles.cardTitle}>Досягнення</h3>
          <div style={styles.achievements}>
            <Achievement value="0" label="By track" color="#ffd700" />
            <Achievement value="0" label="Total wins" color="#00ffcc" />
            <Achievement value="Mud" label="Current Tier" color="#00cc99" />
          </div>
        </Card>
        <Card className="page">
          <h3 style={styles.cardTitle}>Оновлення</h3>
          <div style={styles.gameBadges}>
            <span style={styles.gameBadge}>Telegram</span>
            <span style={styles.gameBadge}>Discord</span>
            <span style={styles.gameBadge}>Twitter</span>
            <span style={styles.gameBadge}>v. alpha 0.19</span>
          </div>
        </Card>
        </Placeholder>
      </div>
      <Link href="/home">
          <Button
            mode="filled"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 100,
              background: 'var(--tgui--secondary_bg_color)',
              padding: 10,
              borderRadius: 50,
              marginBottom: '20px',
              border: '0px solid rgb(255, 255, 255)',
            }}
            name="back"
          >
            <p style={{ 
              fontSize: "20px", 
              color: "#fff", 
              fontWeight: "bold" 
            }}>
              👈 back</p>
          </Button>
        </Link>
    </Page>
  );
}

function Achievement({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "16px", color }}>{value}</p>
      <p style={{ fontSize: "12px", color: "#aaa" }}>{label}</p>
    </div>
  );
} 

import { CSSProperties } from "react";

const styles: { [key: string]: CSSProperties } = {
  container: {
    padding: "20px",
    minHeight: "100vh",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  avatar: {
    borderRadius: "100%",
    width: 60,
    height: 60,
    border: "2px solid #888",
    boxShadow: "0 0 6px #333",
  },
  userName: {
    margin: 0,
    color: "#fff",
    fontSize: "20px",
  },
  levelText: {
    color: "#bbb",
    fontSize: "14px",
    display: "flex",
  },
  xpText: {
    fontSize: "12px",
    color: "#888",
    marginTop: "10px",
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  cardTitle: {
    marginBottom: "50px",
    width: "100%",
    textAlign: "center",
    fontSize: "18px",
    color: "#fff",
  },
  achievements: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  gameBadges: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  gameBadge: {
    background: 'var(--tgui--secondary_bg_color)',
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "14px",
    border: '1px solid rgb(255, 255, 255)',
    fontSize: "14px",
    boxShadow: "inset 0 0 6px rgba(49, 127, 199, 0.1)",
    fontFamily: "monospace",
  },
  statText: {
    padding: "6px 20px",
    borderRadius: "14px",
    color: "#ccc",
    fontSize: "14px",
    fontFamily: "monospace",
  },
};
