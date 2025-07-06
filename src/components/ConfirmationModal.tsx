// src/components/ConfirmationModal.tsx
import React, { CSSProperties } from 'react';

// --- Інтерфейс пропсів ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

// --- Стилі, схожі на ваші інші модальні вікна ---
const styles: { [key: string]: CSSProperties } = {
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(10, 5, 20, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 110, // Має бути вище, ніж інші модальні вікна
    animation: 'fadeIn 0.3s ease',
  },
  modalContent: {
    background: `url('/bg/parchment_bg.jpg')`,
    backgroundSize: 'cover',
    color: '#2c1d12',
    padding: '30px',
    borderRadius: '8px',
    border: '2px solid #5a3a22',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  modalTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.8rem',
    marginBottom: '15px',
  },
  modalMessage: {
    fontFamily: "'Spectral', serif",
    fontSize: '1.1rem',
    lineHeight: 1.6,
    marginBottom: '25px',
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    padding: '12px 20px',
    border: '2px solid #2c1d12',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  confirmButton: {
    background: '#5a3a22',
    color: '#fefce8',
  },
  cancelButton: {
    background: 'transparent',
    color: '#5a3a22',
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>{title}</h3>
        <div style={styles.modalMessage}>{children}</div>
        <div style={styles.modalActions}>
          <button
            style={{ ...styles.actionButton, ...styles.cancelButton }}
            onClick={onClose}
          >
            Скасувати
          </button>
          <button
            style={{ ...styles.actionButton, ...styles.confirmButton }}
            onClick={onConfirm}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Додамо анімацію для плавної появи
const keyframes = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = keyframes;
  document.head.appendChild(styleSheet);
}