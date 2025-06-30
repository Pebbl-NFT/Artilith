// src/hooks/useNativeBackButton.ts
"use client";
import { backButton } from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

/**
 * Хук для керування нативною кнопкою "Назад" в Telegram.
 */
export const useNativeBackButton = (onBackClick?: () => void) => {
  useEffect(() => {
    if (onBackClick) {
      // --- ОСНОВНА ЗМІНА: Призначаємо обробник через метод .onClick() ---
      backButton.onClick(onBackClick);
      backButton.show();
    }

    // Функція очищення, яка ховає кнопку, коли компонент зникає
    return () => {
      backButton.hide();
      // Приховування кнопки автоматично деактивує обробник,
      // тому окремо його видаляти не потрібно.
    };
  }, [onBackClick]); // Ефект перезапускається, якщо змінюється функція onBackClick
};