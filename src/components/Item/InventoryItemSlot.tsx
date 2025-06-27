import React from 'react';
import Image from 'next/image';
import { MergedInventoryItem } from '@/hooks/useInventory';

// FIX: Пропси оновлено, щоб приймати єдиний тип і не вимагати зайвого
interface InventoryItemSlotProps {
  item: MergedInventoryItem;
  onClick: () => void;
  // `index`, `onEquipToggle`, `fallbackIcon` більше не потрібні для цього компонента
}

const InventoryItemSlot: React.FC<InventoryItemSlotProps> = ({ item, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center bg-white/[0.05] rounded-lg p-2 aspect-square cursor-pointer border border-transparent hover:border-yellow-400 transition-all rarity-border-${item.rarity?.toLowerCase()}`}
    >
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          width={64}
          height={64}
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <span className="text-2xl">❓</span>
      )}
      <p className="text-xs text-white truncate w-full text-center mt-1">{item.name}</p>
      {item.quantity > 1 && (
        <span className="absolute bottom-1 right-1 bg-gray-800 text-white text-xs rounded-full px-2 py-0.5">
          x{item.quantity}
        </span>
      )}
      {item.upgrade_level > 0 && (
         <span className="absolute top-1 left-1 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5">
         +{item.upgrade_level}
       </span>
      )}
    </div>
  );
};

export default InventoryItemSlot;
