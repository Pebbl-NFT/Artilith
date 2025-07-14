// components/Market/ActionCard.tsx
"use client";

import React from "react";
import Image from 'next/image';
import { MergedInventoryItem } from "@/hooks/useInventory";

// Словник для відображення рідкості предметів українською
const rarityDisplayName: Record<string, string> = {
  common: "Звичайний",
  uncommon: "Незвичайний",
  rare: "Рідкісний",
  epic: "Епічний",
  legendary: "Легендарний",
};

// Типи пропсів для нашого нового компонента
type ActionCardProps = {
  item: MergedInventoryItem;
  onClose: () => void;
  children: React.ReactNode; // Цей пропс дозволить нам вставляти будь-які елементи (кнопки, поля вводу)
};

/**
 * ActionCard - це універсальний компонент для відображення детальної інформації про предмет
 * у спливаючому вікні. Він використовує той самий дизайн, що й ItemCard, але є більш
 * гнучким завдяки пропсу `children` для відображення кнопок дій.
 */
export const ActionCard: React.FC<ActionCardProps> = ({ item, onClose, children }) => {
  if (!item) return null;

  // Логіка для визначення наявності статів та класів для рамки, скопійована з ItemCard
  const hasStats = item.stats?.damage > 0 || item.stats?.defense > 0;
  const frameClasses = [
    'item-frame',
    `rarity-${item.rarity?.toLowerCase() || 'common'}`
  ].join(' ');

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      // Основні стилі контейнера, взяті з ItemCard для ідентичного вигляду
      style={{
        position: 'relative',
        backgroundImage: `url('/bg/Cardbg1.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: "20px",
        borderRadius: "12px",
        color: "rgba(255, 255, 255, 0.8)",
        width: "90vw",
        maxWidth: "340px",
        minHeight: "500px",
        textAlign: "center",
        filter: "drop-shadow(0 0px 25px rgba(255, 255, 255, 0.4))",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Кнопка закриття, скопійована з ItemCard */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '33px',
          right: '33px',
          background: 'rgba(0, 0, 0, 0.33)',
          borderRadius: '60px',
          color: 'white',
          width: '20px',
          height: '35px',
          cursor: 'pointer',
          border: 'none',
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

      {/* Верхня частина з зображенням та назвою предмета */}
      <div>
        <div
          className={frameClasses}
          style={{ width: '50%', margin: '30px auto', borderRadius: '20px', position: 'relative' }}
        >
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              style={{ objectFit: 'contain', borderRadius: '20px' }}
            />
          ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', opacity: '0.5' }}>❓</div>}
        </div>
        <h2 className={`rarity-font-${item.rarity?.toLowerCase()}`}
          style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px',
            marginBottom: '20px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
            fontWeight: 'bold', width: '77%', margin: '0 auto 20px auto',
            gap: '8px', border: '1px solid rgba(255,255,255,0.1)'
          }}>
          {item.name}
          {item.upgrade_level > 0 && ` +${item.upgrade_level}`}
        </h2>
      </div>

      {/* Середня частина з характеристиками та інформацією */}
      <div>
        {hasStats && (
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px',
            marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 0 10px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
            color: '#fff', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', fontWeight: 'bold',
            width: '77%', margin: '0 auto 20px auto', gap: '8px', border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            {item.stats?.damage > 0 && <p style={{ margin: 0 }}>🗡️ Шкода: <strong>{item.stats.damage}</strong></p>}
            {item.stats?.defense > 0 && <p style={{ margin: 0 }}>🛡️ Захист: <strong>{item.stats.defense}</strong></p>}
          </div>
        )}
        <div style={{ margin: '15px 0', display: 'flex', justifyContent: 'space-around', gap: '5px', color: '#ccc', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
          <p>Тип: <strong>{item.item_type}</strong></p>
          <p>Рідкість: <strong className={`rarity-font-${item.rarity?.toLowerCase()}`}>{rarityDisplayName[item.rarity] || item.rarity}</strong></p>
        </div>
      </div>

      {/* Нижня частина - область для кнопок та інших елементів */}
      <div style={{ padding: "0 20px 10px 20px", marginTop: 'auto' }}>
        {children}
      </div>
    </div>
  );
};