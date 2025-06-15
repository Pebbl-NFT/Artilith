export type EnemyType = 'normal' | 'miniBoss' | 'boss';
export type Enemy = {
  name: string;
  image: string;
  maxHealth: number;
  currentHealth: number;
  damage: number;
  defense: number;
  critChance: number;
  missChance: number;
  type: EnemyType; // <--- ДОДАНО
};
export type EnemyBase = {
  name: string;
  image: string;
  baseHealth: number;
  baseDamage: number;
  baseDefense: number;
  baseCritChance: number;
  baseMissChance: number;
  type: EnemyType; // <--- ДОДАНО
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
    type: 'normal',
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster2.png',
    baseHealth: 35,
    baseDamage: 2,
    baseDefense: 3,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
    type: 'normal',
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster3.png',
    baseHealth: 40,
    baseDamage: 3,
    baseDefense: 4,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
    type: 'normal',
  },
  {
    name: 'Лісовий розвідник',
    image: '/enemies/forest/forestmonster4.png',
    baseHealth: 50,
    baseDamage: 4,
    baseDefense: 5,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
    type: 'normal',
  },
  {
    name: 'Лісовий Захисник',
    image: '/enemies/forest/forestmonster5.png',
    baseHealth: 60,
    baseDamage: 5,
    baseDefense: 30,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
    type: 'normal',
  },
   {
    name: 'Лісовий Боєць',
    image: '/enemies/forest/forestmonster6.png',
    baseHealth: 85,
    baseDamage: 6,
    baseDefense: 2,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
    type: 'normal',
  },
];
export const miniBosses: EnemyBase[] = [
  {
    name: 'Лісовий страшило (мінібос)',
    image: '/enemies/forest/miniboss1.png',
    baseHealth: 90,
    baseDamage: 7,
    baseDefense: 3,
    baseCritChance: 0.12,
    baseMissChance: 0.08,
    type: 'miniBoss',
  }
];
export const bosses: EnemyBase[] = [
  {
    name: 'Головний Лісовий Древень (Бос)',
    image: '/enemies/forest/boss1.png',
    baseHealth: 2450,
    baseDamage: 22,
    baseDefense: 32,
    baseCritChance: 0.22,
    baseMissChance: 0.04,
    type: 'boss',
  }
];
export function generateSequentialEnemy(
  encounterNumber: number,
  playerLevel: number
): Enemy {
  let template: EnemyBase;
  let enemyType: EnemyType; // Використовуємо визначений тип
  // Визначаємо тип ворога та вибираємо шаблон
  if (encounterNumber % 20 === 0) {
    template = bosses[(Math.floor(encounterNumber / 100) - 1 + bosses.length) % bosses.length];
    enemyType = 'boss';
  } else if (encounterNumber % 6 === 0) { 
    template = miniBosses[(Math.floor(encounterNumber / 6) - 1 + miniBosses.length) % miniBosses.length]; // Додано + miniBosses.length
    enemyType = 'miniBoss';
  } else {
    template = baseEnemies[(encounterNumber - 1 + baseEnemies.length) % baseEnemies.length]; // Додано + baseEnemies.length
    enemyType = 'normal';
  }
  let scaleFactor = 0.3 + playerLevel * (enemyType === 'boss' ? 0.33 : enemyType === 'miniBoss' ? 0.21 : 0.13);
  // Забезпечимо, що scaleFactor не надто малий, особливо на низьких рівнях
  scaleFactor = Math.max(scaleFactor, 0.5); // Мінімальний множник, щоб вороги не були надто слабкими
  const generatedEnemy: Enemy = {
    name: template.name,
    image: template.image,
    maxHealth: Math.max(10, Math.round(template.baseHealth * scaleFactor)), // Мінімальне здоров'я
    currentHealth: Math.max(10, Math.round(template.baseHealth * scaleFactor)),
    damage: Math.max(1, Math.round(template.baseDamage * scaleFactor)), // Мінімальна шкода
    defense: Math.round(template.baseDefense * scaleFactor),
    critChance: Math.min(template.baseCritChance + playerLevel * 0.01 + (enemyType === 'boss' ? 0.08 : enemyType === 'miniBoss' ? 0.04 : 0), 0.55),
    missChance: Math.max(template.baseMissChance - playerLevel * 0.004 - (enemyType === 'boss' ? 0.02 : 0), 0.01),
    type: enemyType, // <--- ПРИСВОЮЄМО ТИП
  };
  console.log(`Generated enemy for encounter ${encounterNumber}: ${generatedEnemy.name}, Type: ${generatedEnemy.type}, HP: ${generatedEnemy.maxHealth}`);
  return generatedEnemy;
}