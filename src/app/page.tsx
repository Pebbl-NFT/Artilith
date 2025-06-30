'use client';

import { useEffect } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react'; // Імпортуємо тип для стилів

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TelegramUser = {
  id: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
};

// --- НОВІ СТИЛІ ДЛЯ ЕКРАНУ ЗАВАНТАЖЕННЯ ---
const styles: { [key: string]: CSSProperties } = {
  pageContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // FIX: Додаємо фонове зображення
    backgroundImage: `url('/bg/loading_screen_bg.jpg')`, // Покладіть ваше зображення сюди
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  loaderBox: {
    backgroundColor: 'rgba(10, 5, 20, 0.8)',
    backdropFilter: 'blur(10px)',
    padding: '30px 40px',
    borderRadius: '12px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    animation: 'fadeIn 1s ease',
  },
  gameTitle: {
    fontFamily: "'Spectral', serif", // Використовуємо ваш ігровий шрифт
    fontSize: '2rem', // 32px
    color: '#e0e7ff',
    textShadow: '0 0 10px rgba(129, 140, 248, 0.5)',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#a7b3d9',
    fontSize: '1rem', // 16px
    marginTop: '15px',
    letterSpacing: '1px',
  },
  // FIX: Стилі для шкали завантаження
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '20px',
    border: '1px solid rgba(129, 140, 248, 0.1)',
  },
  progressBarInner: {
    width: '100%',
    height: '100%',
    borderRadius: '4px',
    backgroundImage: 'linear-gradient(90deg, rgba(129, 140, 248, 0.5) 0%, rgba(167, 139, 250, 0.8) 50%, rgba(129, 140, 248, 0.5) 100%)',
    backgroundSize: '200% 100%',
    animation: 'loading-shimmer 2s infinite linear',
  },
  versionText: {
    position: 'absolute',
    bottom: '10px',
    right: '15px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '12px',
    fontFamily: 'sans-serif',
  }
};


export default function InitDataPage() {
  const initDataState = useSignal(initData.state);
  const router = useRouter();

  useEffect(() => {
    // Вся ваша логіка useEffect залишається без змін
    if (!initDataState?.user) return;
    const user = initDataState.user as TelegramUser;
    const saveUserToSupabase = async () => {
      try {
        const { id, username, firstName, lastName, photoUrl } = user;
        const { error } = await supabase
          .from('users')
          .upsert(
            [{ id, username, first_name: firstName, last_name: lastName, photo_url: photoUrl }],
            { onConflict: 'id' }
          );
        if (error) throw error;
        router.replace('/home');
      } catch (error) {
        console.error('Помилка збереження користувача в Supabase:', error);
      }
    };
    saveUserToSupabase();
  }, [initDataState, router]); // <-- FIX: Додано initDataState в залежності

  return (
    // Використовуємо нову структуру та стилі
    <div style={styles.pageContainer}>
      <div style={styles.loaderBox}>
        <h1 style={styles.gameTitle}>Artilith</h1> {/* Приклад назви гри */}
        
        <p style={styles.loadingText}>Кування долі...</p>
        
        <div style={styles.progressBar}>
          <div style={styles.progressBarInner}></div>
        </div>
      </div>
      
      <div style={styles.versionText}>v0.31.4</div> {/* Напис з версією */}

      {/* Анімація для шкали завантаження */}
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