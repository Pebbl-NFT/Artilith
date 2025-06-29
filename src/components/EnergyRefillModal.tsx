// src/components/EnergyRefillModal.tsx
import React, { CSSProperties } from 'react';

interface EnergyRefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefill: () => void;
  timeToNextFormatted: string;
  currentEnergy: number;
  maxEnergy: number;
}

// --- ОНОВЛЕНІ СТИЛІ ---
const styles: { [key: string]: CSSProperties } = {
  // FIX 2 & 3: Стилі для оверлею, що центрує вікно і розмиває фон
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 5, 20, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    background: 'linear-gradient(145deg, #2a2d3e, #1a1c25)',
    padding: '25px',
    borderRadius: '16px',
    color: 'white',
    textAlign: 'center',
    width: '90%',
    maxWidth: '350px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 0 15px 0',
  },
  // FIX 4: Новий стиль для тексту над таймером
  timerText: {
    fontSize: '16px',
    color: '#a9b3d1',
    marginBottom: '5px',
  },
  timer: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#00ffc8',
    textShadow: '0 0 10px rgba(0, 255, 200, 0.7)',
    marginBottom: '20px',
    letterSpacing: '2px',
  },
  button: {
    background: 'linear-gradient(145deg, #4338ca, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '15px 20px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
  },
  buttonActive: { // Ефект при натисканні
    transform: 'scale(0.98)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  }
};

export const EnergyRefillModal: React.FC<EnergyRefillModalProps> = ({
  isOpen,
  onClose,
  onRefill,
  timeToNextFormatted,
  currentEnergy,
  maxEnergy
}) => {
  if (!isOpen) return null;

  return (
    // FIX 1: Додаємо onClick до оверлею для закриття
    <div style={styles.overlay} onClick={onClose}>
      {/* Цей onClick зупиняє закриття, якщо клікнути по самому вікну */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Відновлення Енергії</h3>
        
        {currentEnergy < maxEnergy ? (
          <>
            {/* FIX 4: Додано текст-підказку */}
            <p style={styles.timerText}>+1 енергії через:</p>
            <p style={styles.timer}>{timeToNextFormatted}</p>
          </>
        ) : (
          <p style={{...styles.timer, color: '#4caf50', textShadow: '0 0 10px #4caf50'}}>Енергія повна!</p>
        )}

        <button 
          style={styles.button} 
          onClick={onRefill}
          onMouseDown={(e) => (e.currentTarget.style.transform = styles.buttonActive.transform as string)}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onTouchStart={(e) => (e.currentTarget.style.transform = styles.buttonActive.transform as string)}
          onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Поповнити за ⭐️
        </button>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};