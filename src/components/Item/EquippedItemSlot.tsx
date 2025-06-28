// src/components/Item/EquippedItemSlot.tsx

import React from 'react';
import Image from 'next/image';
import { MergedInventoryItem } from '@/hooks/useInventory';

interface EquippedItemSlotProps {
  item: MergedInventoryItem | undefined;
  onClick: (item: MergedInventoryItem | undefined) => void;
  fallbackIcon: string;
}

const EquippedItemSlot: React.FC<EquippedItemSlotProps> = ({ item, onClick, fallbackIcon }) => {
  // Клас 'equipped-size' більше не потрібен
  const frameClasses = [
    'item-frame',
    'equipped-item-slot', // <-- ОСЬ ГОЛОВНИЙ КЛАС, ЩО ЗАДАЄ РОЗМІР
    item ? `rarity-${item.rarity?.toLowerCase() || 'common'}` : 'rarity-empty'
  ].join(' ');

  return (
    <div onClick={() => onClick(item)} className={frameClasses}>
      {item && item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          style={{ objectFit: 'contain', borderRadius: '10px' }}
        />
      ) : (
        <span className="text-3xl text-gray-500">{fallbackIcon}</span>
      )}
    </div>
  );
};

export default EquippedItemSlot;