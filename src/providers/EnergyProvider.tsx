// src/providers/EnergyProvider.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient';
import { EnergyContext } from '@/context/EnergyContext'; // Імпортуємо наше "сховище"
import { getAndUpdateUserEnergy } from '@/utils/getAndUpdateUserEnergy';
import { reduceEnergyRPC } from '@/utils/reduceEnergy';

const REGEN_INTERVAL_MS = 10 * 60 * 1000;

export const EnergyProvider = ({ children }: { children: ReactNode }) => {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(20);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeToNext, setTimeToNext] = useState(0);

  // Вся ваша логіка з syncEnergy, useEffect[timer], spendEnergy, etc.
  const syncEnergy = useCallback(async () => {
    if (!userId) {
        setIsLoading(false);
        return;
    };
    const { currentEnergy, maxEnergy, lastUpdated } = await getAndUpdateUserEnergy(userId);
    setEnergy(currentEnergy);
    setMaxEnergy(maxEnergy);
    setLastUpdated(lastUpdated);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    syncEnergy();
  }, [syncEnergy]);

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

  // Збираємо все в один об'єкт, який відповідає типу EnergyContextType
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

  // Надаємо ці значення всім дочірнім компонентам
  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>;
};