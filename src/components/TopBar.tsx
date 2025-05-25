import { Button } from '@telegram-apps/telegram-ui';
import tonSvg from '../app/_assets/ton.svg';
import { useMemo, useEffect, useState, } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import HeroEnergyAutoRegeneration from '@/hooks/HeroEnergyAutoRegeneration';
import { supabase } from "@/lib/supabaseClient";

export default function TopBar({ points }: { points: number }) {
  const [energy, setEnergy] = useState(0);
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const username = useMemo(() => {
    return initDataState?.user?.firstName || 'User';
  }, [initDataState]);

  // Завантажуємо дані користувача із Supabase
    useEffect(() => {
      const fetchUserData = async () => {
        if (!userId) return;
        const { data, error } = await supabase
          .from("users")
          .select("points, click_delay, energy, experience, level")
          .eq("id", userId)
          .single();
        if (error) {
          console.error("Помилка завантаження даних:", error);
        } else if (data) {
          setEnergy(data.energy); // Встановлюємо енергію користувача
        }
      };
      
      fetchUserData();
    }, [userId]);

  useEffect(() => {
    if (initDataState?.user) {
      const user = initDataState.user;
      console.log('User data before saving:', user);
    }
  }, [initDataState?.user]);

    const [heroStats, setHeroStats] = useState({
      health: 20,
      attack: 1,
      defense: 0,
    });

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
        gap: 5,
        top: 0,
        position: 'fixed',
        zIndex: 10,
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
          fontSize: 15,
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
          fontSize: 15,
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
          fontSize: 15,
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
          fontSize: 15,
          marginLeft: "-20px",
          marginRight: "-12px",
        }}
      >
        <HeroEnergyAutoRegeneration
          userId={userId}
          energy={energy}
          setEnergy={setEnergy}
          supabase={supabase}
          heroStats={heroStats}
        />
      </div>
    </div>
  );
}
