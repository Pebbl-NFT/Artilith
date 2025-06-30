// src/components/DesktopFallbackPage.tsx
"use client";
import React, { CSSProperties } from 'react';
import Image from 'next/image';
import logoImage from '@/app/_assets/Artilith_logo-no-bg.png';

const styles: { [key: string]: CSSProperties } = {
  pageContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `url('/bg/dark_fantasy_fallback.jpg')`, // Ваше фонове зображення
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: "'Spectral', serif",
  },
  contentBox: {
    backgroundColor: 'rgba(10, 5, 20, 0.85)',
    backdropFilter: 'blur(10px)',
    padding: '40px',
    borderRadius: '16px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
    width: '90%',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    animation: 'fadeIn 1s ease',
  },
  logoContainer: {
    width: '100px',
    height: '100px',
    position: 'relative',
    margin: '0 auto 20px auto',
  },
  title: {
    fontSize: '1.75rem', // 28px
    color: '#e0e7ff',
    textShadow: '0 0 10px rgba(200, 200, 255, 0.4)',
    marginBottom: '15px',
  },
  subtitle: {
    color: '#a7b3d9',
    fontSize: '1rem', // 16px
    lineHeight: 1.6,
  },
  versionText: {
    position: 'absolute',
    bottom: '15px',
    left: '15px',
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: '12px',
    fontFamily: 'sans-serif',
  }
};

export const DesktopFallbackPage = () => {
  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentBox}>
        <div style={styles.logoContainer}>
          {/* Замініть на шлях до вашого лого */}
            <Image 
                src={logoImage} // Використовуємо імпортовану змінну
                alt="Artilith Logo" 
                layout="fill" 
                objectFit="contain" 
            />
        </div>
        <h1 style={styles.title}>Looks like you've chosen the wrong path...</h1>
        <p style={styles.subtitle}>
          Ця пригода доступна лише в додатку Telegram.
        </p>
      </div>
      <div style={styles.versionText}>v0.31.4</div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};