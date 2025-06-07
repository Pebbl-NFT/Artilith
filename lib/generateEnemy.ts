export type Enemy = {
  name: string;
  image: string;
  maxHealth: number;
  currentHealth: number;
  damage: number;
  defense: number;
  critChance: number;
  missChance: number;
};

export type EnemyBase = {
  name: string;
  image: string;
  baseHealth: number;
  baseDamage: number;
  baseDefense: number;
  baseCritChance: number;
  baseMissChance: number;
};

export const baseEnemies: EnemyBase[] = [
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster1.png',
    baseHealth: 25,
    baseDamage: 1,
    baseDefense: 1,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster2.png',
    baseHealth: 35,
    baseDamage: 2,
    baseDefense: 3,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster3.png',
    baseHealth: 40,
    baseDamage: 3,
    baseDefense: 4,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster4.png',
    baseHealth: 50,
    baseDamage: 4,
    baseDefense: 5,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий Захисник',
    image: '/enemies/forest/forestmonster5.png',
    baseHealth: 60,
    baseDamage: 5,
    baseDefense: 30,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий Боєць',
    image: '/enemies/forest/forestmonster6.png',
    baseHealth: 85,
    baseDamage: 6,
    baseDefense: 2,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
];

// Мінібоси
export const miniBosses: EnemyBase[] = [
  {
    name: 'Лісовий страшило (мінібос)',
    image: '/enemies/forest/miniboss1.png',
    baseHealth: 90,
    baseDamage: 7,
    baseDefense: 3,
    baseCritChance: 0.12,
    baseMissChance: 0.08,
  }
];
// Боси
export const bosses: EnemyBase[] = [
  {
    name: 'Головний Лісовий Древень (Бос)',
    image: '/enemies/forest/boss1.png',
    baseHealth: 2450,
    baseDamage: 22,
    baseDefense: 32,
    baseCritChance: 0.22,
    baseMissChance: 0.04,
  }
];

/**
 * Генерує послідовного ворога для wave-бою:
 * @param encounterNumber Номер поточного бою (1, 2, 3, ...)
 * @param playerLevel Поточний рівень гравця (для масштабу)
 */
export function generateSequentialEnemy(
  encounterNumber: number,
  playerLevel: number
): Enemy {
  let template: EnemyBase;
  let type: 'normal' | 'miniBoss' | 'boss' = 'normal';

  if (encounterNumber % 20 === 0) {
    // БОС кожен 20-й
    template = bosses[(Math.floor(encounterNumber / 20) - 1) % bosses.length];
    type = 'boss';
  } else if (encounterNumber % 6 === 0) {
    // Мінібос кожен 6-й (але не 20-й!)
    template = miniBosses[(Math.floor(encounterNumber / 7) - 1) % miniBosses.length];
    type = 'miniBoss';
  } else {
    // Звичайні вороги — СТРОГО ПО ПОРЯДКУ (НЕ рандом!)
    template = baseEnemies[(encounterNumber - 1) % baseEnemies.length];
    type = 'normal';
  }

  // Масштабування залежить від типу ворога і рівня гравця
  let scaleFactor = 0.3 + playerLevel * (type === 'boss' ? 0.33 : type === 'miniBoss' ? 0.21 : 0.13);

  return {
    name: template.name,
    image: template.image,
    maxHealth: Math.round(template.baseHealth * scaleFactor),
    currentHealth: Math.round(template.baseHealth * scaleFactor),
    damage: Math.round(template.baseDamage * scaleFactor),
    defense: Math.round(template.baseDefense * scaleFactor),
    critChance: Math.min(template.baseCritChance + playerLevel * 0.01 + (type === 'boss' ? 0.08 : type === 'miniBoss' ? 0.04 : 0), 0.55),
    missChance: Math.max(template.baseMissChance - playerLevel * 0.004 - (type === 'boss' ? 0.02 : 0), 0.01),
  };
}