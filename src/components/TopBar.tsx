// src/components/TopBar.tsx
import React from 'react';
import Image from 'next/image';
import HeroEnergyAutoRegeneration from '@/hooks/HeroEnergyAutoRegeneration';

// 1. Оновлюємо інтерфейс, щоб приймати всі баланси
export interface TopBarProps {
    points: number;
    atl_balance?: number; // Зроблено необов'язковим для гнучкості
    ton_balance?: number; // Зроблено необов'язковим для гнучкості
}

export default function TopBar({ points, atl_balance = 0, ton_balance = 0 }: TopBarProps) {
    // 2. Повністю видалена вся логіка завантаження (useState, useEffect, useCallback).
    // Компонент тепер максимально простий.

    return (
        <div className='top-bar' style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            height: 50,
            backgroundColor: "#121015",
            backdropFilter: "blur(2px)",
            position: 'fixed',
            top: 0,
            zIndex: 10,
            padding: '0 10px',
            boxSizing: 'border-box'
        }}>
            {/* Блок TON балансу */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
                <span>💎</span>
                {/* 3. Використовуємо дані, передані з пропсів */}
                <span>{ton_balance.toFixed(4)}</span>
            </div>

            {/* Блок ATL балансу */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
                <Image src="/coin/atl_g.png" alt="ATL" width={16} height={16} />
                <span>{atl_balance.toFixed(4)}</span>
            </div>

            {/* Блок очок */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
                <Image src="/coin/atl_s.png" alt="Points" width={16} height={16} />
                <span>{Math.floor(points)}</span>
            </div>
            
            {/* Блок енергії */}
            <HeroEnergyAutoRegeneration />
        </div>
    );
}