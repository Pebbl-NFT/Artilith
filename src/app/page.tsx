'use client';

import { useEffect, useState, CSSProperties, useCallback } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// --- СТИЛІ ---
const styles: { [key: string]: CSSProperties } = {
  pageContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `url('/bg/loading_screen_bg.jpg')`,
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
    fontFamily: "'Spectral', serif",
    fontSize: '2rem',
    color: '#e0e7ff',
    textShadow: '0 0 10px rgba(129, 140, 248, 0.5)',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#a7b3d9',
    fontSize: '1rem',
    marginTop: '15px',
    letterSpacing: '1px',
    minHeight: '24px', // Резервуємо місце, щоб уникнути стрибків
  },
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
  const [statusText, setStatusText] = useState('Ініціалізація...');

  const initializeUser = useCallback(async (user: any) => {
    setStatusText('Перевірка гравця...');
    
    try {
      const { error } = await supabase.rpc('get_or_create_user', {
        p_user_id: String(user.id),
        p_first_name: user.firstName || 'Новий гравець'
      });

      if (error) throw error;
      
      setStatusText('Вхід у світ Artilith...');
      
      // Невелика затримка для кращого UX
      setTimeout(() => {
        router.replace('/home');
      }, 1000);

    } catch (err) {
      console.error('Помилка ініціалізації гравця:', err);
      setStatusText('Сталася помилка. Спробуйте перезавантажити.');
    }
  }, [router]);

  useEffect(() => {
    // Викликаємо ініціалізацію, тільки якщо user з'явився
    if (initDataState?.user) {
      initializeUser(initDataState.user);
    }
  }, [initDataState?.user, initializeUser]);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.loaderBox}>
        <h1 style={styles.gameTitle}>Artilith</h1>
        <p style={styles.loadingText}>{statusText}</p>
        <div style={styles.progressBar}>
          <div style={styles.progressBarInner}></div>
        </div>
        <div style={styles.versionText}>alpha 0.31.9</div>
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