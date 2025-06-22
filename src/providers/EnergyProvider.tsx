import React, { ReactNode } from 'react';
import { useEnergySystem } from '@/hooks/useEnergySystem'; // <-- Імпортуємо наш існуючий хук з логікою
import { EnergyContext } from '@/context/EnergyContext';  // <-- Імпортуємо "сховище", створене на Кроці 1

// --- Документація: Опис пропсів для нашого Провайдера ---
// Йому потрібні 'children' - це компоненти, які він буде "огортати".
// А також 'userId' та 'supabase', оскільки вони потрібні для роботи нашого хука useEnergySystem.
interface EnergyProviderProps {
    children: ReactNode;
    userId: string | number | undefined;
    supabase: any; // Ви можете вказати тут більш точний тип SupabaseClient
}

// --- Документація: Сам компонент-провайдер ---
export const EnergyProvider = ({ children, userId, supabase }: EnergyProviderProps) => {
    // Вся наша складна логіка, як і раніше, живе в одному місці - в хуку useEnergySystem!
    // Провайдер лише викликає його.
    const energySystemData = useEnergySystem(userId, supabase);

    // Тепер найголовніше:
    // Ми використовуємо EnergyContext.Provider, щоб "покласти" дані з energySystemData
    // у наше спільне "сховище".
    // Усі дочірні компоненти (`children`) тепер зможуть отримати ці дані.
    return (
        <EnergyContext.Provider value={energySystemData}>
            {children}
        </EnergyContext.Provider>
    );
};