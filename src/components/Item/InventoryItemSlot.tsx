// src/components/Item/InventoryItemSlot.tsx
import React from 'react';
import Image from 'next/image';
import { MergedInventoryItem } from '@/hooks/useInventory';

export interface InventoryItemSlotProps {
  item: MergedInventoryItem;
  onClick: () => void;
  price?: number;
}

const InventoryItemSlot: React.FC<InventoryItemSlotProps> = ({ item, onClick, price }) => {
  // --- СТИЛІ ---

  // Стиль для рамки, щоб вона могла бути батьківським елементом для оверлею
  const frameStyle: React.CSSProperties = {
    position: 'relative', // Це обов'язково для позиціонування дочірнього оверлею
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  // Стиль для самої плашки "На продажі"
  const saleOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-10deg)',
    width: '120%',
    padding: '5px 0',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)', // для підтримки Safari
    color: '#fff',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    borderTop: '1px solid rgba(255, 255, 255, 0.6)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
    pointerEvents: 'none',
  };
  
  // --- КІНЕЦЬ СТИЛІВ ---

  const frameClasses = [
    'item-frame',
    `rarity-${item.rarity?.toLowerCase() || 'common'}`,
  ].join(' ');

  const fontClasses = `rarity-font-${item.rarity?.toLowerCase() || 'common'}`;

  return (
    <div onClick={onClick} className="inventory-slot-wrapper">
      {/* Застосовуємо стиль до рамки */}
      <div className={frameClasses} style={frameStyle}>
        
        {item.is_listed && (
          // Застосовуємо стиль до оверлею
          <div style={saleOverlayStyle}>
            На продажі
          </div>
        )}

        {item.equipped && <div className="equipped-indicator" title="Екіпіровано"></div>}

        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            style={{ objectFit: 'contain', borderRadius: '10px' }}
          />
        ) : (
          <span className="text-4xl text-slate-500">?</span>
        )}
      </div>

      <p className={`inventory-item-name ${fontClasses}`}>{item.name}</p>

      {price !== undefined && (
        <p className="inventory-item-price">
          {price} 🪨
        </p>
      )}

      {item.quantity > 1 && (
        <span className="quantity-indicator">x{item.quantity}</span>
      )}
      {item.upgrade_level > 0 && (
        <span className="upgrade-indicator">+{item.upgrade_level}</span>
      )}
    </div>
  );
};

export default InventoryItemSlot;