// src/utils/getAndUpdateUserEnergy.ts
import { supabase } from "@/lib/supabaseClient";

// --- Документація: Конфігурація регенерації ---
// Встановлюємо, що 1 одиниця енергії відновлюється кожну хвилину.
const ENERGY_PER_MINUTE = 1; 

/**
 * Отримує, розраховує та оновлює енергію гравця на сервері.
 * Це ключова функція для реалізації офлайн-регенерації.
 * @param userId - ID гравця
 * @returns Об'єкт з актуальною та максимальною енергією { currentEnergy, maxEnergy }
 */
export const getAndUpdateUserEnergy = async (userId: string | number) => {
    // 1. Отримуємо поточні дані гравця з бази даних
    const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("energy, max_energy, last_energy_update_at")
        .eq("id", userId)
        .single();

    if (fetchError || !user) {
        console.error("Помилка при отриманні даних для оновлення енергії:", fetchError?.message);
        return { currentEnergy: 0, maxEnergy: 20 }; // Повертаємо значення за замовчуванням
    }

    const { energy, max_energy, last_energy_update_at } = user;

    // Якщо енергія вже максимальна, нічого не робимо, просто повертаємо її
    if (energy >= max_energy) {
        return { currentEnergy: energy, maxEnergy: max_energy };
    }

    // 2. Розраховуємо, скільки часу пройшло з останнього оновлення
    const now = new Date();
    const lastUpdate = new Date(last_energy_update_at);
    
    // Різниця в хвилинах
    const minutesPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);

    if (minutesPassed <= 0) {
        // Якщо не пройшло навіть повної хвилини, нічого не додаємо
        return { currentEnergy: energy, maxEnergy: max_energy };
    }

    // 3. Розраховуємо нову енергію, але не більше максимуму
    const regeneratedEnergy = minutesPassed * ENERGY_PER_MINUTE;
    const newCalculatedEnergy = Math.min(energy + regeneratedEnergy, max_energy);

    // 4. Оновлюємо дані в базі даних: і енергію, і час оновлення
    const { error: updateError } = await supabase
        .from("users")
        .update({ 
            energy: newCalculatedEnergy, 
            last_energy_update_at: now.toISOString() 
        })
        .eq("id", userId);

    if (updateError) {
        console.error("Помилка при оновленні енергії в базі:", updateError.message);
        // Навіть при помилці повертаємо розраховане значення, щоб UI був коректним
        return { currentEnergy: newCalculatedEnergy, maxEnergy: max_energy };
    }

    // 5. Повертаємо фінальні дані
    return { currentEnergy: newCalculatedEnergy, maxEnergy: max_energy };
};