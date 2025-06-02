import { Button } from '@telegram-apps/telegram-ui';
import tonSvg from '../app/_assets/ton.svg';
import { useMemo, useEffect, useState, } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import HeroEnergyAutoRegeneration from '@/hooks/HeroEnergyAutoRegeneration';
import { supabase } from "@/lib/supabaseClient";

interface TopBarProps {
    points: number;
    energy: number; // Тепер енергія приходить як пропс
    setEnergy: (energy: number) => void; // Функція оновлення енергії також приходить як пропс
  }

export default function TopBar({ points, energy, setEnergy }: TopBarProps) {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const username = useMemo(() => {
    return initDataState?.user?.firstName || 'User';
  }, [initDataState]);

  useEffect(() => {
    if (initDataState?.user) {
      const user = initDataState.user;
      console.log('User data before saving:', user);
    }
  }, [initDataState?.user]);

  return (
    <div className='top-bar' 
    style={{ 
      display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: 50,
        background: 'rgb(33, 46, 58)',
        backdropFilter: "blur(2px)",
        transition: "filter 0.3s ease",
        pointerEvents: "auto",
        gap: 0,
        top: 0,
        position: 'fixed',
        zIndex: 10,
        fontSize: 9,
    }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: "30px",
          padding: 10,
          color: "#fff",
          animation: "fadeIn 0.6s ease forwards",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>💎</span>
          <span> 0 </span> 
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: "30px",
          padding: 10,
          color: "#fff",
          animation: "fadeIn 0.6s ease forwards",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>🪙</span>
          <span> 0 </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: "30px",
          padding: 10,
          color: "#fff",
          animation: "fadeIn 0.6s ease forwards",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>🪨</span>
          <span> {points}  </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: "30px",
          padding: 10,
          color: "#fff",
          animation: "fadeIn 0.6s ease forwards",
          fontSize: 12,
        }}
      >
        <HeroEnergyAutoRegeneration
          userId={userId}
          energy={energy}
          setEnergy={setEnergy}
          supabase={supabase}
        />
      </div>
    </div>
  );
}
