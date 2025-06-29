// src/components/HeroEnergyAutoRegeneration.jsx
import React from 'react';
import { useEnergy } from '@/context/EnergyContext'; // <-- Правильний шлях до нашого хука

/**
 * Компонент, що відповідає ЛИШЕ за відображення енергії в TopBar
 * і слугує кнопкою для відкриття модального вікна.
 */
function HeroEnergyAutoRegeneration() {
    // Тепер нам потрібні лише ці значення з контексту
    const { 
      energy, 
      maxEnergy, 
      isLoading,
      openEnergyModal // Тільки функція для відкриття
    } = useEnergy();

    // Завантажувач, якщо дані ще не отримані
    if (isLoading) {
        return (
            <div style={{ padding: '0 10px', color: "#fff", minHeight: "24px", display: "flex", alignItems: "center", gap: "5px" }}>
                <span>⚡</span>
                <span>...</span>
            </div>
        );
    }
    
    return (
      // Цей div тепер лише кнопка. Він більше не рендерить модальне вікно.
      <div
          onClick={openEnergyModal}
          title="Енергія"
          style={{
              display: "flex", alignItems: "center", gap: "5px", 
              color: "#fff", fontSize: 12, cursor: 'pointer', minHeight: "24px", padding: '0 10px'
          }}
      >
          <span>⚡</span>
          <span style={{ marginLeft: 2, fontWeight: "bold", color: energy >= maxEnergy ? "#22d3ee" : "#ffe066" }}>
              {energy}
          </span>
          {energy < maxEnergy && (
              <span style={{ marginLeft: 2, color: "#9ca3af" }}>
                  / {maxEnergy}
              </span>
          )}
          {energy >= maxEnergy && (
              <span style={{ marginLeft: 4, fontSize: 10, color: "#48e19f", fontWeight: 600 }}>
                  MAX
              </span>
          )}
      </div>
      // Модальне вікно <EnergyRefillModal /> звідси видалено!
    );
}

export default HeroEnergyAutoRegeneration;