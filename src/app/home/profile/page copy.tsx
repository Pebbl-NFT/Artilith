"use client";

import React, { useEffect, useState } from "react";
import { Button } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { Progress, Card } from "@telegram-apps/telegram-ui";
import { useSignal, initData } from "@telegram-apps/sdk-react";
import { supabase } from "@/lib/supabaseClient";

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
        <h1
            style={{
                fontSize: "3rem",
                fontWeight: "bold",
                marginBottom: "16px",
                marginTop: "-4px",
                textAlign: "center",
                lineHeight: "1",
                color: "#fff",
            }}
            >
            Profile
        </h1>
        <div style={styles.profileHeader}>
          {userAvatar && (
            <img src={userAvatar} alt="avatar" style={styles.avatar} />
          )}
          <div>
            <h2 style={styles.userName}>{userName}</h2>
            <p style={styles.levelText}>Level {level}</p>
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <Progress value={(nextLevelProgress / 1000) * 100} />
          <p style={styles.xpText}>{1000 - nextLevelProgress} XP to next level</p>
        </div>

        <Card style={styles.card}>
          <h3 style={styles.cardTitle}>Achievements</h3>
          <div style={styles.achievements}>
            <Achievement value="96" label="By track" color="#ffd700" />
            <Achievement value="45" label="Total wins" color="#00ffcc" />
            <Achievement value="Diamond" label="Current Tier" color="#00cc99" />
          </div>
        </Card>

        <Card style={styles.card}>
          <h3 style={styles.cardTitle}>Games</h3>
          <div style={styles.gameBadges}>
            <span style={styles.gameBadge}>🪨 Artilith</span>
            <span style={styles.gameBadge}>🧱 Blocks</span>
          </div>
        </Card>

        <Card style={styles.card}>
          <h3 style={styles.cardTitle}>Statistics</h3>
          <p style={styles.statText}>
          🪨 <strong>{userData.points}</strong> Shards
          </p>
          <p style={styles.statText}>
            ⏱️ <strong>{userData.click_delay}</strong> ms delay
          </p>
          {userData.created_at && (
            <p style={styles.statText}>
              📅 Joined {new Date(userData.created_at).toLocaleDateString()}
            </p>
          )}
        </Card>
      </div>
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
    backgroundColor: "#1a1a1a",
    minHeight: "100vh",
    color: "#fff",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  avatar: {
    borderRadius: "50%",
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
  },
  xpText: {
    fontSize: "12px",
    color: "#888",
    marginTop: "4px",
  },
  card: {
    marginTop: "20px",
    backgroundColor: "#2b2b2b",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  cardTitle: {
    marginBottom: "12px",
    fontSize: "16px",
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
    gap: "10px",
    flexWrap: "wrap",
  },
  gameBadge: {
    backgroundColor: "#444",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "14px",
    fontSize: "14px",
    boxShadow: "inset 0 0 6px rgba(255,255,255,0.1)",
    fontFamily: "monospace",
  },
  statText: {
    margin: "6px 0",
    color: "#ccc",
    fontSize: "14px",
  },
};
