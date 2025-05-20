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
    baseHealth: 20,
    baseDamage: 1,
    baseDefense: 1,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster2.png',
    baseHealth: 30,
    baseDamage: 3,
    baseDefense: 3,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster3.png',
    baseHealth: 40,
    baseDamage: 4,
    baseDefense: 4,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster4.png',
    baseHealth: 50,
    baseDamage: 5,
    baseDefense: 5,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий Захисник',
    image: '/enemies/forest/forestmonster5.png',
    baseHealth: 50,
    baseDamage: 3,
    baseDefense: 30,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Лісовий Боєць',
    image: '/enemies/forest/forestmonster6.png',
    baseHealth: 65,
    baseDamage: 10,
    baseDefense: 2,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
];

export function generateEnemy(level: number): Enemy {
  const enemyTemplate = baseEnemies[Math.floor(Math.random() * baseEnemies.length)];
  const scaleFactor = 1 + level * 0.2;

  return {
    name: enemyTemplate.name,
    image: enemyTemplate.image,
    maxHealth: Math.round(enemyTemplate.baseHealth * scaleFactor),
    currentHealth: Math.round(enemyTemplate.baseHealth * scaleFactor),
    damage: Math.round(enemyTemplate.baseDamage * scaleFactor),
    defense: Math.round(enemyTemplate.baseDefense * scaleFactor),
    critChance: Math.min(enemyTemplate.baseCritChance + level * 0.01, 0.5),
    missChance: Math.max(enemyTemplate.baseMissChance - level * 0.005, 0.01),
  };
}