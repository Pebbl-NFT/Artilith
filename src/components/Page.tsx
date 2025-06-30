// src/components/Page.tsx
'use client';
import React, { type PropsWithChildren } from 'react';
import { useNativeBackButton } from '@/hooks/useNativeBackButton'; // Імпортуємо наш хук

interface PageProps {
  back?: () => void;
  children: React.ReactNode;
}

export function Page({ back, children }: PageProps) {
  // Викликаємо хук для керування нативною кнопкою "Назад" Telegram
  useNativeBackButton(back);

  // Компонент просто повертає своїх "дітей" без додаткової обгортки
  return <>{children}</>;
}