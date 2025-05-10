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

type EnemyBase = {
  name: string;
  image: string;
  baseHealth: number;
  baseDamage: number;
  baseDefense: number;
  baseCritChance: number;
  baseMissChance: number;
};

const baseEnemies: EnemyBase[] = [
  {
    name: 'Слайм',
    image: '/enemies/slimeidle.gif',
    baseHealth: 8,
    baseDamage: 1,
    baseDefense: 1,
    baseCritChance: 0.05,
    baseMissChance: 0.1,
  },
  {
    name: 'Летючий',
    image: '/enemies/batidle.gif',
    baseHealth: 10,
    baseDamage: 3,
    baseDefense: 2,
    baseCritChance: 0.1,
    baseMissChance: 0.08,
  },
  {
    name: 'Гриб',
    image: '/enemies/mushroomidle.gif',
    baseHealth: 20,
    baseDamage: 9,
    baseDefense: 30,
    baseCritChance: 0.12,
    baseMissChance: 0.05,
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
