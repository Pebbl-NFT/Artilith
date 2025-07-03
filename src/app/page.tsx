'use client';

import { useEffect } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient'; // Імпортуйте ваш клієнт supabase
import { useRouter } from 'next/navigation';
import { CSSProperties, useState } from 'react';

// ... (вставте сюди ваш об'єкт `styles`)
const styles: { [key: string]: CSSProperties } = {
    // ... ваш код стилів без змін
};

export default function InitDataPage() {
  const initDataState = useSignal(initData.state);
  const router = useRouter();
  const [statusText, setStatusText] = useState('Завантаження даних...');

  useEffect(() => {
    // 1. Залишаємо перевірку. Якщо user ще не завантажився, нічого не робимо.
    if (!initDataState?.user) {
      return;
    }

    // 2. Створюємо локальну константу. 
    // Тепер TypeScript точно знає, що `user` не є `undefined`.
    const user = initDataState.user;

    const initializeUserAndRedirect = async () => {
      setStatusText('Перевірка гравця...');
      
      // 3. Використовуємо нову, безпечну константу `user`.
      const { error } = await supabase.rpc('get_or_create_user', {
        p_user_id: String(user.id),
        p_first_name: user.firstName || 'Новий гравець'
      });

      if (error) {
        console.error('Помилка ініціалізації гравця:', error);
        setStatusText('Сталася помилка. Спробуйте пізніше.');
        return;
      }
      
      setStatusText('Вхід у світ Artilith...');
      
      setTimeout(() => {
        router.replace('/home');
      }, 500);
    };

    initializeUserAndRedirect();

  }, [initDataState, router]);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.loaderBox}>
        <h1 style={styles.gameTitle}>Artilith</h1>
        
        {/* Використовуємо стан для тексту */}
        <p style={styles.loadingText}>{statusText}</p>
        
        <div style={styles.progressBar}>
          <div style={styles.progressBarInner}></div>
        </div>
        <div style={styles.versionText}>v0.31.4</div>
      </div>
      <style>{`
        @keyframes loading-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}