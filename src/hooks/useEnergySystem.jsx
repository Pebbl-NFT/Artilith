// src/hooks/useEnergySystem.ts
import { useState, useEffect, useCallback } from "react";
import { getAndUpdateUserEnergy } from "@/utils/getAndUpdateUserEnergy"; // Наша функція з попереднього кроку
import { reduceEnergyRPC } from "@/utils/reduceEnergy"; // Наша нова функція для зменшення енергії

// --- Документація: Хук для керування системою енергії ---
// Цей хук інкапсулює всю логіку:
// 1. Отримання актуальної енергії з сервера при завантаженні (з урахуванням офлайн-регену).
// 2. Симуляція регенерації в реальному часі на клієнті (без запитів до БД).
// 3. Надання функції для "витрати" енергії, яка спілкується з сервером.

export const useEnergySystem = (userId, supabase) => {
    const [energy, setEnergy] = useState(0);
    const [maxEnergy, setMaxEnergy] = useState(20); // Початкове значення
    const [isLoading, setIsLoading] = useState(true);

    // --- Крок 1: Первинне завантаження та синхронізація з сервером ---
    useEffect(() => {
        if (!userId) return;

        const syncEnergy = async () => {
            setIsLoading(true);
            // Викликаємо нашу головну функцію, яка все розрахує
            const { currentEnergy, maxEnergy: serverMaxEnergy } = await getAndUpdateUserEnergy(userId);
            setEnergy(currentEnergy);
            setMaxEnergy(serverMaxEnergy);
            setIsLoading(false);
        };

        syncEnergy();
    }, [userId]);

    // --- Крок 2: Клієнтський таймер для візуальної регенерації ---
    useEffect(() => {
        // Таймер запускається тільки після завантаження даних і якщо енергія не повна
        if (isLoading || energy >= maxEnergy) {
            return;
        }

        // Таймер, який просто додає одиничку до стану кожні 5 хвилин
        // ВАЖЛИВО: він не робить запитів до БД!
        const timerId = setInterval(() => {
            setEnergy(prevEnergy => {
                if (prevEnergy < maxEnergy) {
                    return prevEnergy + 1;
                }
                return prevEnergy;
            });
        }, 300000); // 5 хвилин = 300 000 мс

        return () => clearInterval(timerId);

    }, [isLoading, energy, maxEnergy]);
    
    // --- Крок 3: Функція для витрати енергії ---
    const spendEnergy = useCallback(async (amount) => {
        if (energy < amount) {
            console.log("Недостатньо енергії на клієнті");
            return false; // Помилка, енергії не вистачає
        }

        // Оптимістичне оновлення UI
        setEnergy(prev => prev - amount);
        
        // Виклик надійної RPC-функції на сервері
        const success = await reduceEnergyRPC(userId, amount);

        if (!success) {
            // Якщо на сервері сталася помилка (наприклад, розсинхронізація),
            // повертаємо енергію назад і синхронізуємось знову.
            console.error("Помилка витрати енергії на сервері. Відкат.");
            setEnergy(prev => prev + amount); // Відкат
            return false;
        }
        
        return true; // Успіх
    }, [userId, energy]);


    return { energy, maxEnergy, isLoading, spendEnergy };
};