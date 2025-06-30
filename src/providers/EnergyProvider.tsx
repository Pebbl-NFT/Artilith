// src/providers/EnergyProvider.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js'; // Імпортуємо тип
import { EnergyContext } from '@/context/EnergyContext';
import { getAndUpdateUserEnergy } from '@/utils/getAndUpdateUserEnergy';
import { reduceEnergyRPC } from '@/utils/reduceEnergy';

const REGEN_INTERVAL_MS = 10 * 60 * 1000;

// --- ОСНОВНА ЗМІНА №1: Описуємо нові пропси ---
interface EnergyProviderProps {
  children: ReactNode;
  userId: number | undefined;
  supabase: SupabaseClient;
}

export const EnergyProvider = ({ children, userId, supabase }: EnergyProviderProps) => {
  
  // --- ОСНОВНА ЗМІНА №2: Видаляємо отримання userId та supabase звідси ---
  // const initDataState = useSignal(initData.state);
  // const userId = initDataState?.user?.id;
  // Тепер ми отримуємо їх з пропсів.

  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(20);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeToNext, setTimeToNext] = useState(0);

  // Всі інші функції (syncEnergy, useEffect, spendEnergy і т.д.)
  // залишаються без змін, оскільки вони вже використовують змінні `userId` та `supabase`.
  
  const syncEnergy = useCallback(async () => {
    if (!userId) {
        setIsLoading(false);
        return;
    };
    // Ця функція тепер буде використовувати userId, переданий через пропси
    const { currentEnergy, maxEnergy, lastUpdated } = await getAndUpdateUserEnergy(userId);
    setEnergy(currentEnergy);
    setMaxEnergy(maxEnergy);
    setLastUpdated(lastUpdated);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    syncEnergy();
  }, [syncEnergy]);
  
  // ... і так далі для всієї іншої логіки ...
  useEffect(() => {
    if (isLoading || !lastUpdated || energy >= maxEnergy) {
        setTimeToNext(0);
        return;
    }
    const timerId = setInterval(() => {
        const now = Date.now();
        const lastUpdatedDate = new Date(lastUpdated).getTime();
        const elapsed = now - lastUpdatedDate;
        const timeIntoInterval = elapsed % REGEN_INTERVAL_MS;
        const remainingTime = REGEN_INTERVAL_MS - timeIntoInterval;
        setTimeToNext(remainingTime);
        if (remainingTime <= 1000) {
            setTimeout(() => syncEnergy(), 1100);
        }
    }, 1000);
    return () => clearInterval(timerId);
  }, [isLoading, energy, maxEnergy, lastUpdated, syncEnergy]);

  const spendEnergy = useCallback(async (amount: number) => {
    if (!userId || energy < amount) return false;
    setEnergy(prev => prev - amount);
    const success = await reduceEnergyRPC(userId, amount);
    if (!success) {
      syncEnergy();
      return false;
    }
    if (energy === maxEnergy) {
      setLastUpdated(new Date().toISOString());
    }
    return true;
  }, [userId, energy, maxEnergy, syncEnergy]);

  const getEnergy = useCallback(() => energy, [energy]);
  const openEnergyModal = () => setIsModalOpen(true);
  const closeEnergyModal = () => setIsModalOpen(false);

  const timeToNextFormatted = useMemo(() => {
    if (timeToNext <= 0) return "00:00";
    const totalSeconds = Math.floor(timeToNext / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [timeToNext]);

  const value = {
    energy,
    maxEnergy,
    isLoading,
    spendEnergy,
    getEnergy,
    isModalOpen,
    openEnergyModal,
    closeEnergyModal,
    timeToNextFormatted
  };

  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>;
};