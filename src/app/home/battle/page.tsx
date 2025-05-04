// app/battle/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getEquippedStats } from "@/utils/getEquippedStats"; // твоя утиліта підрахунку стат
import AllItems from "@/data/AllItems";
import { fetchUserData } from "@/utils/fetchUserData"; // створи або заміни реальним запитом

const BattlePage = () => {
  const [player, setPlayer] = useState<any>(null);
  const [enemy, setEnemy] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [criticalPointActive, setCriticalPointActive] = useState(false);
  const [playerNextCrit, setPlayerNextCrit] = useState(false);

  useEffect(() => {
    const initBattle = async () => {
      const userData = await fetchUserData(); // отримай дані про гравця
      const equippedStats = getEquippedStats(userData.equipped, AllItems);

      setPlayer({
        name: "Гравець",
        ...equippedStats,
        currentHp: equippedStats.hp,
      });

      setEnemy({
        name: "Гоблін",
        damage: 6,
        defense: 2,
        hp: 50,
        currentHp: 50,
      });
    };

    initBattle();
  }, []);

  useEffect(() => {
    if (player && enemy) {
      const interval = setInterval(() => {
        setLog((prev) => [...prev, "---- Новий раунд ----"]);

        // Хід гравця
        if (Math.random() > 0.1) {
          const isCrit = playerNextCrit || Math.random() < (player.critChance || 0);
          const damage = Math.max(player.damage - enemy.defense, 0);
          const totalDamage = isCrit ? damage * 2 : damage;

          setEnemy((prev) => ({
            ...prev,
            currentHp: Math.max(prev.currentHp - totalDamage, 0),
          }));

          setLog((prev) => [
            ...prev,
            isCrit ? "Критичний удар!" : "Гравець атакує.",
            `Гоблін отримує ${totalDamage} шкоди.`,
          ]);
        } else {
          setLog((prev) => [...prev, "Гравець промахнувся."]);
        }

        setPlayerNextCrit(false);

        // Активація крит. точки
        if ((player.critChance || 0) > 0 && Math.random() < player.critChance) {
          setCriticalPointActive(true);
        } else {
          setCriticalPointActive(false);
        }

        // Хід ворога
        if (Math.random() > 0.15) {
          const damage = Math.max(enemy.damage - player.defense, 0);
          setPlayer((prev) => ({
            ...prev,
            currentHp: Math.max(prev.currentHp - damage, 0),
          }));
          setLog((prev) => [...prev, `Гоблін атакує та завдає ${damage} шкоди.`]);
        } else {
          setLog((prev) => [...prev, "Гоблін промахнувся."]);
        }

      }, 2000);

      return () => clearInterval(interval);
    }
  }, [player, enemy, playerNextCrit]);

  const handleCritClick = () => {
    if (criticalPointActive) {
      setPlayerNextCrit(true);
      setCriticalPointActive(false);
      setLog((prev) => [...prev, "Ви активували критичну точку! Наступний удар — критичний!"]);
    }
  };

  return (
    <div className="battle-page" style={{ padding: "30px", color: "#fff", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "10px" }}>⚔️ БІЙ ⚔️</h1>

      {player && enemy && (
        <>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "30px" }}>
            <div>
              <h2>{player.name}</h2>
              <p>❤️ {player.currentHp}/{player.hp}</p>
              <p>🛡️ Захист: {player.defense}</p>
              <p>🗡️ Шкода: {player.damage}</p>
              <p>🎯 Крит шанс: {Math.round((player.critChance || 0) * 100)}%</p>
            </div>
            <div>
              <h2>{enemy.name}</h2>
              <p>❤️ {enemy.currentHp}/{enemy.hp}</p>
              <p>🛡️ Захист: {enemy.defense}</p>
              <p>🗡️ Шкода: {enemy.damage}</p>
            </div>
          </div>

          {criticalPointActive && (
            <button
              onClick={handleCritClick}
              style={{
                padding: "10px 20px",
                fontSize: "1.2rem",
                background: "gold",
                border: "2px solid #fff",
                borderRadius: "8px",
                cursor: "pointer",
                animation: "pulse 1s infinite",
              }}
            >
              🎯 Натисни для крит. удару!
            </button>
          )}

          <div style={{ marginTop: "40px", textAlign: "left", maxWidth: "600px", margin: "auto" }}>
            <h3>Хід бою:</h3>
            <div style={{ maxHeight: "300px", overflowY: "auto", backgroundColor: "#111", padding: "10px", borderRadius: "10px" }}>
              {log.map((entry, index) => (
                <p key={index} style={{ margin: "4px 0", color: "#ccc" }}>{entry}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BattlePage;