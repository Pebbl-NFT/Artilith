// Цей файл містить логіку для розрахунку VIP-статусу гравця

// Визначаємо пороги для кожного VIP-рівня
const VIP_THRESHOLDS = [
    { level: 0, requiredATL: 0 },
    { level: 1, requiredATL: 10 },
    { level: 2, requiredATL: 50 },
    { level: 3, requiredATL: 200 },
    { level: 4, requiredATL: 1000 },
    { level: 5, requiredATL: 5000 },
    // Можна додавати більше рівнів
];

interface VipStatus {
    level: number;
    progress: number; // Прогрес у відсотках до наступного рівня
    currentATL: number; // Поточний баланс
    nextLevelATL: number; // Скільки потрібно для наступного рівня
}

export const calculateVipLevel = (atlBalance: number): VipStatus => {
    // Знаходимо поточний рівень, шукаючи з кінця масиву
    const currentTier = [...VIP_THRESHOLDS].reverse().find(tier => atlBalance >= tier.requiredATL);

    if (!currentTier) {
        // На випадок, якщо щось пішло не так
        return { level: 0, progress: 0, currentATL: atlBalance, nextLevelATL: VIP_THRESHOLDS[1]?.requiredATL || 10 };
    }

    const currentLevel = currentTier.level;
    const currentLevelATL = currentTier.requiredATL;

    // Знаходимо наступний рівень
    const nextTier = VIP_THRESHOLDS.find(tier => tier.level === currentLevel + 1);

    if (!nextTier) {
        // Це максимальний рівень
        return { level: currentLevel, progress: 100, currentATL: atlBalance, nextLevelATL: currentLevelATL };
    }

    const nextLevelATL = nextTier.requiredATL;
    
    const progressInTier = atlBalance - currentLevelATL;
    const totalForNextLevel = nextLevelATL - currentLevelATL;
    const progress = totalForNextLevel > 0 ? (progressInTier / totalForNextLevel) * 100 : 100;

    return {
        level: currentLevel,
        progress: Math.min(progress, 100), // Прогрес не може бути більше 100%
        currentATL: atlBalance,
        nextLevelATL: nextLevelATL
    };
};