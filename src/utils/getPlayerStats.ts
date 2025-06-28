// src/utils/getPlayerStats.ts

import { MergedInventoryItem } from "@/hooks/useInventory";

// Інтерфейс для фінальних характеристик гравця
export interface PlayerStats {
  health: number;
  attack: number;
  defense: number;
}

// Типи для вашої внутрішньої логіки апгрейдів
type UpgradableItemStats = {
  damage: number;
  defense: number;
};

/**
 * Розраховує фінальні характеристики гравця, враховуючи рівень, екіпіровку та рівень покращення предметів.
 * @param allItems - Масив всіх предметів в інвентарі гравця.
 * @param playerLevel - Поточний рівень гравця.
 * @returns Об'єкт з фінальними характеристиками (здоров'я, атака, захист).
 */
export function getPlayerStats(
  allItems: MergedInventoryItem[],
  playerLevel: number
): PlayerStats {

  // 1. Розраховуємо базові характеристики на основі рівня гравця.
  const baseStats: PlayerStats = {
    health: 20 + (playerLevel - 1) * 5,
    attack: 1,
    defense: 0,
  };

  // 2. Ваша функція для розрахунку бонусів від апгрейду. Ми її зберігаємо!
  const getUpgradedStats = (base: UpgradableItemStats, level: number): UpgradableItemStats => {
    // Наприклад: +1 damage і +10% defense за кожен рівень
    return {
      damage: base.damage + level,
      defense: Math.round(base.defense * (1 + 0.1 * level)),
    };
  };

  // 3. Фільтруємо лише екіпіровані предмети
  const equippedItems = allItems.filter(item => item.equipped);

  // 4. Проходимо по кожному екіпірованому предмету і додаємо його характеристики до базових
  equippedItems.forEach((item) => {
    // Перевіряємо, чи є у предмета об'єкт 'stats'
    if (item.stats) {
      // Беремо базові характеристики з об'єкта item.stats
      const itemBaseStats: UpgradableItemStats = {
        damage: item.stats.damage || 0,
        defense: item.stats.defense || 0,
      };

      // Розраховуємо фінальні характеристики предмета з урахуванням його рівня покращення
      const finalItemStats = getUpgradedStats(
        itemBaseStats,
        item.upgrade_level ?? 0
      );

      // Додаємо розраховані характеристики до загальних
      baseStats.attack += finalItemStats.damage;
      baseStats.defense += finalItemStats.defense;
    }
  });

  // 5. Повертаємо фінальні розраховані характеристики
  return baseStats;
}