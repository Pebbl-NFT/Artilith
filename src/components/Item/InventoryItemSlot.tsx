// src/components/Item/InventoryItemSlot.tsx
import React from 'react';
import Image from 'next/image';
import { MergedInventoryItem } from '@/hooks/useInventory';

export interface InventoryItemSlotProps {
  item: MergedInventoryItem;
  onClick: () => void;
  price?: number;
  priceCurrencyIcon?: React.ReactNode;
  hideName?: boolean; // <-- 1. Додаємо новий необов'язковий пропс
}

const InventoryItemSlot: React.FC<InventoryItemSlotProps> = ({ 
  item, 
  onClick, 
  price, 
  priceCurrencyIcon, 
  hideName = false // <-- 2. Отримуємо пропс, за замовчуванням він false
}) => {
  const frameStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    flexGrow: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  const saleOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '80%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-10deg)',
    width: '120%',
    padding: '5px 0',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    color: '#fff',
    textAlign: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    borderTop: '1px solid rgba(255, 255, 255, 0.6)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
    pointerEvents: 'none',
    zIndex: 10,
  };
  
  const frameClasses = [
    'item-frame',
    `rarity-${item.rarity?.toLowerCase() || 'common'}`,
  ].join(' ');

  const fontClasses = `rarity-font-${item.rarity?.toLowerCase() || 'common'}`;

  return (
    <div 
      onClick={onClick} 
      className="inventory-slot-wrapper" 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div className={frameClasses} style={frameStyle}>
        
        {item.is_listed && ( <div style={saleOverlayStyle}> Продається </div> )}
        {item.equipped && <div className="equipped-indicator" title="Екіпіровано"></div>}

        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            style={{ objectFit: 'contain', borderRadius: '10px'}}
          />
        ) : (
          <span className="text-4xl text-slate-500">?</span>
        )}
      </div>

      {/* 3. Обертаємо назву в умову: показуємо, тільки якщо hideName=false */}
      {!hideName && <p className={`inventory-item-name ${fontClasses}`}>{item.name}</p>}

      {price !== undefined && (
        <p className="inventory-item-price">
          {price} {priceCurrencyIcon || '🪨'}
        </p>
      )}

      {item.quantity > 1 && ( <span className="quantity-indicator">x{item.quantity}</span> )}
      {item.upgrade_level > 0 && ( <span className="upgrade-indicator">+{item.upgrade_level}</span> )}
    </div>
  );
};

export default InventoryItemSlot;