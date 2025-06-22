import { createContext, useContext, ReactNode } from 'react';

// --- Документація: Опис (інтерфейс) даних, які будуть у нашому спільному сховищі ---
// Ми кажемо, що будь-який компонент, що використовує цей контекст,
// отримає доступ до поточного значення енергії, максимального, статусу завантаження
// і, що дуже важливо, до функції для витрати енергії.
interface EnergyContextType {
    energy: number;
    maxEnergy: number;
    isLoading: boolean;
    spendEnergy: (amount: number) => Promise<boolean>; // Функція для надійної витрати енергії
}

// --- Документація: Створюємо сам контекст ---
// `createContext` створює об'єкт Context. Поки що він порожній (undefined).
// Ми заповнимо його даними в наступному кроці за допомогою "Провайдера".
const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

// --- Документація: Створюємо кастомний хук `useEnergy` ---
// Це маленький помічник, щоб нам не доводилося писати `useContext(EnergyContext)` кожного разу.
// Він також перевіряє, чи компонент знаходиться всередині нашого Провайдера,
// і видає зрозумілу помилку, якщо ні. Це дуже хороша практика.
export const useEnergy = () => {
    const context = useContext(EnergyContext);
    if (context === undefined) {
        // Ця помилка допоможе нам у майбутньому, якщо ми забудемо "огорнути" частину додатку в провайдер.
        throw new Error('Хук useEnergy має використовуватися всередині EnergyProvider');
    }
    return context;
};

// Експортуємо сам контекст для використання в Провайдері на наступному кроці.
export { EnergyContext };