// src/utils/getAndUpdateUserEnergy.ts
import { supabase } from "@/lib/supabaseClient";

const REGEN_INTERVAL_MS = 10 * 60 * 1000; // 10 хвилин

/**
 * Отримує, розраховує та оновлює енергію гравця на сервері.
 * @param userId - ID гравця
 * @returns Об'єкт з актуальною енергією, максимальною енергією та часом останнього оновлення.
 */
export const getAndUpdateUserEnergy = async (userId: string | number) => {
  if (!userId) {
    console.warn("getAndUpdateUserEnergy: userId is missing.");
    return { currentEnergy: 0, maxEnergy: 20, lastUpdated: new Date().toISOString() };
  }

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("energy, max_energy, last_energy_update_at")
    .eq("id", String(userId))
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user data for energy update:", fetchError?.message);
    return { currentEnergy: 0, maxEnergy: 20, lastUpdated: new Date().toISOString() };
  }

  const { energy, max_energy, last_energy_update_at } = user;
  const maxEnergy = max_energy || 20;

  // Якщо енергія повна, просто повертаємо поточні дані
  if (energy >= maxEnergy) {
    // FIX: Повертаємо last_energy_update_at
    return { currentEnergy: energy, maxEnergy, lastUpdated: last_energy_update_at };
  }

  const now = new Date();
  const lastUpdate = new Date(last_energy_update_at || now);
  
  const tenMinuteIntervalsPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / REGEN_INTERVAL_MS);

  // Якщо не пройшло достатньо часу для регенерації, повертаємо поточні дані
  if (tenMinuteIntervalsPassed <= 0) {
    // FIX: Повертаємо last_energy_update_at
    return { currentEnergy: energy, maxEnergy, lastUpdated: last_energy_update_at };
  }

  const regeneratedEnergy = tenMinuteIntervalsPassed;
  const newCalculatedEnergy = Math.min(energy + regeneratedEnergy, maxEnergy);

  // Створюємо новий час, додавши до старого лише повні відрегенеровані інтервали
  // Це запобігає втраті "дрібних" секунд
  const newLastUpdatedAt = new Date(lastUpdate.getTime() + tenMinuteIntervalsPassed * REGEN_INTERVAL_MS);

  const { error: updateError } = await supabase
    .from("users")
    .update({ 
        energy: newCalculatedEnergy, 
        last_energy_update_at: newLastUpdatedAt.toISOString() 
    })
    .eq("id", String(userId));

  if (updateError) {
    console.error("Error updating energy in DB:", updateError.message);
    // Навіть якщо помилка, повертаємо розраховані дані, щоб UI оновився
    return { currentEnergy: newCalculatedEnergy, maxEnergy, lastUpdated: newLastUpdatedAt.toISOString() };
  }

  // FIX: Повертаємо новий час оновлення
  return { currentEnergy: newCalculatedEnergy, maxEnergy, lastUpdated: newLastUpdatedAt.toISOString() };
};