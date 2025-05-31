type UpgradableItem = {
  damage: number;
  defense: number;
};

type UpgradedStats = {
  damage: number;
  defense: number;
};

export function getPlayerStats(inventory: any[]) {
  const baseStats = {
    health: 20,
    attack: 1,
    defense: 0,
  };

  const getUpgradedStats = (base: UpgradableItem, level: number): UpgradedStats => {
    // Наприклад: +1 damage і +10% defense за кожен рівень
    return {
      damage: base.damage + level,
      defense: Math.round(base.defense * (1 + 0.1 * level)),
    };
  };

  inventory.forEach((item) => {
    if (item.equipped) {
      // Обчислюємо покращені характеристики
      const stats = getUpgradedStats(
        {
          damage: Number(item.damage) || 0,
          defense: Number(item.defense) || 0,
        },
        item.upgrade_level ?? 0
      );

      baseStats.attack += stats.damage; // Додаємо шкоду
      baseStats.defense += stats.defense; // Додаємо захист
    }
  });

  return baseStats;
}