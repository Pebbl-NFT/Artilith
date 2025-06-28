"use client";
import React from "react";
import Image from 'next/image';
import { MergedInventoryItem } from "@/hooks/useInventory";

// Мапінг для відображення назв рідкості
const rarityDisplayName: Record<string, string> = {
  common: "Звичайний",
  uncommon: "Незвичайний",
  rare: "Рідкісний",
  epic: "Епічний",
  legendary: "Легендарний",
  // Додайте інші типи рідкості за потреби
};

// FIX: Пропси оновлено для нової логіки
type ItemCardProps = {
  mode: "inventory" | "equipped";
  item: MergedInventoryItem;
  onEquipRequest: (item: MergedInventoryItem) => void;
  onUnequipRequest: (item: MergedInventoryItem) => void;
  onSellRequest: (item: MergedInventoryItem) => void;
  onClose: () => void; // Додано пропс для закриття
};

// Стилі для кнопок
const buttonStyle = (type: 'primary' | 'danger') => ({
  backgroundColor: type === 'primary' ? "rgba(81, 81, 85, 0.4)" : "rgba(81, 81, 85, 0.4)",
  border: "none",
  padding: "10px 20px",
  fontSize: "clamp(0.9rem, 2.5vw, 1rem)", // Адаптивний розмір шрифту
  color: "#fff",
  borderRadius: "28px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  width: '133px', // Задаємо фіксовану ширину
  height: '35px', // і висоту
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

export const ItemCard: React.FC<ItemCardProps> = ({
  mode,
  item,
  onEquipRequest,
  onUnequipRequest,
  onSellRequest,
  onClose, // Отримуємо функцію закриття
}) => {
  if (!item) return null;

  const hasStats = item.stats?.damage > 0 || item.stats?.defense > 0;
  const frameClasses = [
    'item-frame',
    `rarity-${item.rarity?.toLowerCase() || 'common'}`
  ].join(' ');

  const isEquippable = item.item_type === 'weapon' || item.item_type === 'shield';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative', // Потрібно для абсолютного позиціонування кнопки закриття
        backgroundImage: `url('/bg/Cardbg1.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: "20px",
        borderRadius: "12px",
        color: "#fff",
        width: "90vw",
        maxWidth: "340px",
        minHeight: "500px",
        textAlign: "center",
        filter: "drop-shadow(0 0px 25px rgba(180, 180, 255, 0.4))",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* FIX: Додано кнопку закриття (хрестик) */}
      <button
        onClick={onClose}
        style={{
            position: 'absolute',
            top: '18px',
            right: '35px',
            background: 'rgba(0, 0, 0, 0.33)',
            borderRadius: '60px',
            color: 'white',
            width: '20px',
            height: '35px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            lineHeight: '1',
            zIndex: 10,
        }}
        aria-label="Закрити"
    >
        &times;
    </button>

      <div>
        <div 
          className={frameClasses}
          style={{ width: '50%', margin: '30px auto',borderRadius:'20px' }} // Задаємо розмір та центруємо рамку
        >
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill // Оновлений синтаксис
              style={{ objectFit: 'contain',borderRadius:'20px' }} // padding вже є в .item-frame
            />
          ) : <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', opacity: '0.5'}}>❓</div>}
        </div>


        <h2 className={`rarity-font-${item.rarity?.toLowerCase()}`} 
        style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '-33px',
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
            fontWeight: 'bold',
            width: '77%',
            margin: '0 auto 20px auto',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
          {item.name}
          {item.upgrade_level > 0 && ` +${item.upgrade_level}`}
        </h2>
      </div>

      <div>
        {hasStats && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
            fontWeight: 'bold',
            width: '77%',
            margin: '0 auto 20px auto',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {item.stats?.damage > 0 && <p style={{margin: 0}}>🗡️ Шкода: <strong>{item.stats.damage}</strong></p>}
            {item.stats?.defense > 0 && <p style={{margin: 0}}>🛡️ Захист: <strong>{item.stats.defense}</strong></p>}
          </div>
        )}

        <div style={{ margin: '15px 0', display: 'flex', justifyContent: 'space-around', gap: '5px', color: '#ccc', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
          <p>Тип: <strong>{item.item_type}</strong></p>
          <p>Рідкість: <strong className={`rarity-font-${item.rarity?.toLowerCase()}`}>{rarityDisplayName[item.rarity] || item.rarity}</strong></p>
        </div>
      </div>

      <div style={{ marginLeft:'22px', marginTop: '20px', display: 'flex', flexDirection: 'row', gap: '33px' }}>
        {mode === 'inventory' && onEquipRequest && isEquippable && (
          <button style={buttonStyle('primary')} onClick={() => onEquipRequest(item)}>Спорядити</button>
        )}

        {mode === 'equipped' && onUnequipRequest && (
            <button style={buttonStyle('primary')} onClick={() => onUnequipRequest(item)}>Зняти</button>
        )}
        <button style={buttonStyle('danger')} onClick={() => onSellRequest(item)}>Продати</button>
      </div>
    </div>
  );
};
