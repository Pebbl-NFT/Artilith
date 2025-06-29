// src/context/EnergyContext.tsx
"use client";
import { createContext, useContext } from 'react';

// Описуємо всі дані та функції, які наш контекст буде надавати
export interface EnergyContextType {
  energy: number;
  maxEnergy: number;
  isLoading: boolean;
  spendEnergy: (amount: number) => Promise<boolean>;
  getEnergy: () => number;
  isModalOpen: boolean;
  openEnergyModal: () => void;
  closeEnergyModal: () => void;
  timeToNextFormatted: string;
}

// Створюємо контекст
export const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

// Створюємо хук для зручного використання контексту
export const useEnergy = () => {
  const context = useContext(EnergyContext);
  if (context === undefined) {
    throw new Error('useEnergy must be used within an EnergyProvider');
  }
  return context;
};