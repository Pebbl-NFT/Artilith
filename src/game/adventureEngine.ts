// src/game/adventureEngine.ts

// =======================================================================
// 1. ТИПИ ДАНИХ (визначення структур для ворогів та етапів)
// =======================================================================
export interface Enemy {
    name: string;
    image: string;
    maxHealth: number;
    damage: number;
    defense: number;
    critChance: number;
    missChance: number;
    type: 'normal' | 'miniBoss' | 'boss';
}

export type StageContent = 
    | { type: 'battle'; data: Enemy }
    | { type: 'event_chest'; data: { eventName: 'Скриня' } }
    | { type: 'rest_stop'; data: { message: 'Ви знайшли безпечний притулок.' } };


// =======================================================================
// 2. БАЗА ВОРОГІВ (повністю взята з вашого файлу)
// =======================================================================
const baseEnemies = [
    { name: 'Лісовий розвідник', image: '/enemies/forest/forestmonster1.png', baseHealth: 25, baseDamage: 1, baseDefense: 1, baseCritChance: 0.05, baseMissChance: 0.1 },
    { name: 'Лісовий розвідник', image: '/enemies/forest/forestmonster2.png', baseHealth: 35, baseDamage: 2, baseDefense: 3, baseCritChance: 0.05, baseMissChance: 0.1 },
    { name: 'Лісовий розвідник', image: '/enemies/forest/forestmonster3.png', baseHealth: 40, baseDamage: 3, baseDefense: 4, baseCritChance: 0.05, baseMissChance: 0.1 },
    { name: 'Лісовий розвідник', image: '/enemies/forest/forestmonster4.png', baseHealth: 50, baseDamage: 4, baseDefense: 5, baseCritChance: 0.05, baseMissChance: 0.1 },
    // Роль: "Танк" - багато здоров'я та броні, але низька атака.
    { 
        name: 'Моховик-Душитель', 
        image: '/enemies/forest/moss-strangler.png', // Потрібно додати це зображення
        baseHealth: 120, // Високе здоров'я
        baseDamage: 2,   // Низька атака
        baseDefense: 15,  // Висока броня
        baseCritChance: 0.02, 
        baseMissChance: 0.15 
    },

    // Роль: "Скляна гармата" - висока атака, але мало здоров'я та броні.
    { 
        name: 'Шипохвіст', 
        image: '/enemies/forest/spiketail.png', // Потрібно додати це зображення
        baseHealth: 30,  // Низьке здоров'я
        baseDamage: 12,  // Висока атака
        baseDefense: 0,   // Немає броні
        baseCritChance: 0.10, 
        baseMissChance: 0.05 
    },
    { name: 'Лісовий Захисник', image: '/enemies/forest/forestmonster5.png', baseHealth: 60, baseDamage: 5, baseDefense: 30, baseCritChance: 0.05, baseMissChance: 0.1 },
    { name: 'Лісовий Боєць', image: '/enemies/forest/forestmonster6.png', baseHealth: 85, baseDamage: 6, baseDefense: 2, baseCritChance: 0.05, baseMissChance: 0.1 },
];
const miniBosses = [
    { name: 'Лісовий страшило (мінібос)', image: '/enemies/forest/miniboss1.png', baseHealth: 90, baseDamage: 7, baseDefense: 3, baseCritChance: 0.12, baseMissChance: 0.08 }
];
const bosses = [
    { name: 'Головний Лісовий Древень (Бос)', image: '/enemies/forest/boss1.png', baseHealth: 1450, baseDamage: 22, baseDefense: 32, baseCritChance: 0.22, baseMissChance: 0.04 }
];


// =======================================================================
// 3. ЛОГІКА СТВОРЕННЯ ВОРОГА (об'єднує ваш scaleFactor і вибір шаблону)
// =======================================================================
function createEnemy(stageNumber: number, playerLevel: number, enemyType: Enemy['type']): Enemy {
    let template;

    // Вибираємо шаблон ворога
    switch (enemyType) {
        case 'boss':
            template = bosses[0]; // Поки що у нас один фінальний бос
            break;
        case 'miniBoss':
            // Циклічно вибираємо мінібоса, якщо їх буде кілька
            template = miniBosses[(Math.floor(stageNumber / 20) - 1 + miniBosses.length) % miniBosses.length];
            break;
        case 'normal':
        default:
            // Циклічно вибираємо звичайного ворога
            template = baseEnemies[(stageNumber - 1 + baseEnemies.length) % baseEnemies.length];
            break;
    }

    // --- ВАША УНІКАЛЬНА ФОРМУЛА МАСШТАБУВАННЯ ---
    let scaleFactor = 0.2 + playerLevel * (enemyType === 'boss' ? 0.33 : enemyType === 'miniBoss' ? 0.11 : 0.07);
    scaleFactor = Math.max(scaleFactor, 0.3);
    
    // --- ВАШ УНІКАЛЬНИЙ РОЗРАХУНОК СТАТІВ ---
    return {
        name: template.name,
        image: template.image,
        type: enemyType,
        maxHealth: Math.max(10, Math.round(template.baseHealth * scaleFactor)),
        damage: Math.max(1, Math.round(template.baseDamage * scaleFactor)),
        defense: Math.round(template.baseDefense * scaleFactor),
        critChance: Math.min(template.baseCritChance + playerLevel * 0.01 + (enemyType === 'boss' ? 0.08 : enemyType === 'miniBoss' ? 0.04 : 0), 0.55),
        missChance: Math.max(template.baseMissChance - playerLevel * 0.004 - (enemyType === 'boss' ? 0.02 : 0), 0.01),
    };
}


// =======================================================================
// 4. ГОЛОВНА ФУНКЦІЯ ГЕНЕРАЦІЇ ЕТАПУ ("ДИРИГЕНТ")
// =======================================================================
export function generateStage(stageNumber: number, playerLevel: number): StageContent {
    // Гарантовані боси згідно з новою логікою (100 етапів)
    if (stageNumber === 100) {
        return { type: 'battle', data: createEnemy(stageNumber, playerLevel, 'boss') };
    }
    if (stageNumber > 0 && stageNumber % 20 === 0) { // Кожен 20-й етап (20, 40, 60, 80) - мінібос
        return { type: 'battle', data: createEnemy(stageNumber, playerLevel, 'miniBoss') };
    }

    // Розігруємо, що станеться на звичайному етапі
    const chance = Math.random();

    if (chance < 0.80) { // 80% шанс на звичайний бій
        return { type: 'battle', data: createEnemy(stageNumber, playerLevel, 'normal') };
    }
    if (chance < 0.95) { // 15% шанс на подію зі скринею
        return { type: 'event_chest', data: { eventName: 'Скриня' } };
    } 
    // 5% шанс на відпочинок
    return { type: 'rest_stop', data: { message: 'Ви знайшли безпечний притулок.' } };
}

