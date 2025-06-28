import React from 'react';
import Image from 'next/image';
import { MergedInventoryItem } from '@/hooks/useInventory';

interface InventoryItemSlotProps {
  item: MergedInventoryItem;
  onClick: () => void;
}

const InventoryItemSlot: React.FC<InventoryItemSlotProps> = ({ item, onClick }) => {
  // Класи для рамки, які будуть застосовані до зображення або заглушки
  const frameClasses = [
    'item-frame', // Базовий клас для рамки
    `rarity-${item.rarity?.toLowerCase() || 'common'}`,
  ].join(' ');

  // Класи для тексту під рамкою
  const fontClasses = `rarity-font-${item.rarity?.toLowerCase() || 'common'}`;

  return (
    // 1. ЦЕ ГОЛОВНИЙ КОНТЕЙНЕР (wrapper), він має клас, що робить його flex-колонкою.
    <div onClick={onClick} className="inventory-slot-wrapper">
      
      {/* 2. ЦЕ НАША РАМКА. Всередині неї - ТІЛЬКИ зображення або іконка-заглушка. */}
      {/* Вона буде першим дочірнім елементом у flex-колонці. */}
      <div className={frameClasses}>
        {item.equipped && <div className="equipped-indicator" title="Екіпіровано"></div>}

        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill 
            style={{ objectFit: 'contain',borderRadius: '10px'}} 
          />
        ) : (
          <span className="text-4xl text-slate-500">?</span>
        )}
      </div>

      {/* 3. А ЦЕ НАЗВА. Вона є "сусідом" рамки, а не її дочірнім елементом. */}
      {/* Вона буде другим дочірнім елементом у flex-колонці, тому опиниться під рамкою. */}
      <p className={`inventory-item-name ${fontClasses}`}>{item.name}</p>

      {/* Індикатори тепер позиціонуються відносно головного контейнера */}
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