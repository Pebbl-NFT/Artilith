import { useMemo, useEffect, useState, useCallback } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import Image from 'next/image'; // <-- 1. Імпортуємо компонент Image
import HeroEnergyAutoRegeneration from '@/hooks/HeroEnergyAutoRegeneration';
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

interface TopBarProps {
    points: number;
}

export default function TopBar({ points }: TopBarProps) {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [tonBalance, setTonBalance] = useState<number>(0);
  const [atlBalance, setAtlBalance] = useState<number>(0);

  const fetchBalance = useCallback(async (balanceColumn: 'ton_balance' | 'atl_balance', setBalanceState: (value: number) => void) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select(balanceColumn)
        .eq("id", String(userId))
        .single();
      if (error) throw error;
      if (data) {
        const typedData = data as Record<typeof balanceColumn, number | null>;
        const balance = typedData[balanceColumn] || 0;
        setBalanceState(parseFloat(Number(balance).toFixed(4)));
      } else {
        setBalanceState(0);
      }
    } catch (err: any) {
      console.error(`Error fetching ${balanceColumn}:`, err.message);
      toast.error("An unexpected error occurred while loading balances.");
      setBalanceState(0);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchBalance('ton_balance', setTonBalance);
      fetchBalance('atl_balance', setAtlBalance);
    }
  }, [userId, fetchBalance]);

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
      {/* Блок TON балансу (залишаємо емодзі, бо іконки немає) */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
        <span>💎</span>
        <span>{tonBalance.toFixed(4)}</span>
      </div>

      {/* --- ЗМІНА 2: Блок ATL балансу з новою іконкою --- */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
        <Image src="/coin/atl_g.png" alt="ATL" width={16} height={16} />
        <span>{atlBalance.toFixed(4)}</span>
      </div>

      {/* --- ЗМІНА 3: Блок очок з новою іконкою --- */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
        <Image src="/coin/atl_s.png" alt="Points" width={16} height={16} />
        <span>{points}</span>
      </div>
      
      {/* Блок енергії */}
      <HeroEnergyAutoRegeneration />
    </div>
  );
}