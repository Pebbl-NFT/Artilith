import { useMemo, useEffect, useState } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
// Update the path below to the correct relative path if the file exists elsewhere, for example:
import HeroEnergyAutoRegeneration from '@/hooks/HeroEnergyAutoRegeneration';
// Or, if the file does not exist, create it at src/components/hooks/HeroEnergyAutoRegeneration.tsx
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useCallback } from 'react';

interface TopBarProps {
    points: number;
}

export default function TopBar({ points }: TopBarProps) {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  // Стан для балансів
  const [tonBalance, setTonBalance] = useState<number>(0);
  const [atlBalance, setAtlBalance] = useState<number>(0); // <-- ЗМІНА: Додано стан для ATL

  // <-- ЗМІНА: Створено одну універсальну функцію для завантаження будь-якого балансу
  const fetchBalance = useCallback(async (balanceColumn: 'ton_balance' | 'atl_balance', setBalanceState: (value: number) => void) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select(balanceColumn)
        .eq("id", String(userId))
        .single();

      if (error) {
        console.error(`Error fetching ${balanceColumn}:`, error.message);
        setBalanceState(0);
      } else if (data) {
        // Явно типізуємо data, щоб уникнути помилки TypeScript
        const typedData = data as Record<'ton_balance' | 'atl_balance', number | null>;
        const balance = typedData[balanceColumn] || 0;
        setBalanceState(parseFloat(Number(balance).toFixed(4)));
      } else {
        setBalanceState(0);
      }
    } catch (err) {
      console.error(`Unexpected error fetching ${balanceColumn}:`, err);
      toast.error("An unexpected error occurred while loading balances.");
      setBalanceState(0);
    }
  }, [userId]); // useCallback залежить тільки від userId

  useEffect(() => {
    if (userId) {
      // <-- ЗМІНА: Викликаємо універсальну функцію для обох балансів
      fetchBalance('ton_balance', setTonBalance);
      fetchBalance('atl_balance', setAtlBalance);
    }
  }, [userId, fetchBalance]); // Додаємо fetchBalance до залежностей

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
        <span>{tonBalance.toFixed(4)}</span>
      </div>

      {/* Блок ATL балансу */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
        <span>🪙</span>
        {/* <-- ЗМІНА: Відображаємо реальний баланс ATL замість 0 */}
        <span>{atlBalance.toFixed(4)}</span>
      </div>

      {/* Блок очок */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: 12 }}>
        <span>🪨</span>
        <span>{points}</span>
      </div>
      
      {/* Блок енергії */}
      <HeroEnergyAutoRegeneration userId={userId} supabase={supabase} />
    </div>
  );
}

/* Removed erroneous local useCallback definition that was shadowing React's useCallback */
