// src/utils/getAndUpdateUserEnergy.ts
import { supabase } from "@/lib/supabaseClient";

/**
 * Отримує, розраховує та оновлює енергію гравця на сервері.
 * Це ключова функція для реалізації офлайн-регенерації.
 * @param userId - ID гравця
 * @returns Об'єкт з актуальною та максимальною енергією { currentEnergy, maxEnergy }
 */
export const getAndUpdateUserEnergy = async (userId: string | number) => {
    if (!userId) {
        console.warn("getAndUpdateUserEnergy: userId is missing.");
        return { currentEnergy: 0, maxEnergy: 20 };
    }

    const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("energy, max_energy, last_energy_update_at")
        .eq("id", String(userId))
        .single();

    if (fetchError || !user) {
        console.error("Error fetching user data for energy update:", fetchError?.message);
        return { currentEnergy: 0, maxEnergy: 20 };
    }

    const { energy, max_energy, last_energy_update_at } = user;

    if (energy >= max_energy) {
        return { currentEnergy: energy, maxEnergy: max_energy };
    }

    const now = new Date();
    // Використовуємо `|| now` щоб уникнути помилки, якщо last_energy_update_at ще не встановлено
    const lastUpdate = new Date(last_energy_update_at || now);
    
    // --- ЗМІНА ЛОГІКИ ---
    // Рахуємо, скільки повних 10-хвилинних інтервалів пройшло.
    // 600000 мілісекунд = 10 хвилин.
    const tenMinuteIntervalsPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / 600000);

    if (tenMinuteIntervalsPassed <= 0) {
        return { currentEnergy: energy, maxEnergy: max_energy };
    }

    // --- ЗМІНА ЛОГІКИ ---
    // Кожен інтервал дає 1 енергію.
    const regeneratedEnergy = tenMinuteIntervalsPassed;

    const newCalculatedEnergy = Math.min(energy + regeneratedEnergy, max_energy);

    // Оновлюємо дані в базі даних: і енергію, і час оновлення
    // Важливо: оновлюємо час, навіть якщо енергія не змінилась, щоб не робити зайвих розрахунків
    const { error: updateError } = await supabase
        .from("users")
        .update({ 
            energy: newCalculatedEnergy, 
            last_energy_update_at: now.toISOString() 
        })
        .eq("id", String(userId));

    if (updateError) {
        console.error("Error updating energy in DB:", updateError.message);
        return { currentEnergy: newCalculatedEnergy, maxEnergy: max_energy };
    }

    return { currentEnergy: newCalculatedEnergy, maxEnergy: max_energy };
};