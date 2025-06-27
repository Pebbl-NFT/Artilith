import React from 'react';
import Image from 'next/image';
import { MergedInventoryItem } from '@/hooks/useInventory';

// FIX: Пропси оновлено для роботи з єдиним типом MergedInventoryItem
interface EquippedItemSlotProps {
  item: MergedInventoryItem | undefined; // Предмет може бути не споряджений (undefined)
  onClick: (item: MergedInventoryItem | undefined) => void;
  fallbackIcon: string;
}

const EquippedItemSlot: React.FC<EquippedItemSlotProps> = ({ item, onClick, fallbackIcon }) => {
  return (
    <div
      onClick={() => onClick(item)}
      className="w-16 h-16 bg-white/[0.05] rounded-lg flex items-center justify-center cursor-pointer border border-gray-600 hover:border-yellow-400 transition-all"
    >
      {/* Використовуємо item.image_url з нашого нового уніфікованого типу */}
      {item && item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          width={48}
          height={48}
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <span className="text-3xl text-gray-500">{fallbackIcon}</span>
      )}
    </div>
  );
};

export default EquippedItemSlot;
