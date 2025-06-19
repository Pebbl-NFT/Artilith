import { Button } from '@telegram-apps/telegram-ui';
import tonSvg from '../app/_assets/ton.svg';
import { useMemo, useEffect, useState, } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import HeroEnergyAutoRegeneration from '@/hooks/HeroEnergyAutoRegeneration';
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast"; // Додаємо toast для сповіщень

interface TopBarProps {
    points: number;
    energy: number; // Тепер енергія приходить як пропс
    setEnergy: (energy: number) => void; // Функція оновлення енергії також приходить як пропс
}

export default function TopBar({ points, energy, setEnergy }: TopBarProps) {
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  // Додаємо новий стан для зберігання балансу TON
  const [tonBalance, setTonBalance] = useState<number>(0);

  const username = useMemo(() => {
    return initDataState?.user?.firstName || 'User';
  }, [initDataState]);

  // Функція для завантаження балансу TON
  const fetchTonBalance = async () => {
    if (!userId) {
      console.warn("User ID is not available to fetch TON balance.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("ton_balance")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching TON balance:", error.message);
        toast.error("Failed to load TON balance.");
        setTonBalance(0); // Встановлюємо 0 у разі помилки
      } else if (data) {
        // Перетворюємо TON баланс у число з фіксованою кількістю знаків після коми для відображення
        // або зберігаємо як є, якщо потрібна точність.
        // Для відображення, можливо, краще округлити.
        setTonBalance(parseFloat(data.ton_balance.toFixed(4))); // Округлюємо до 4 знаків для відображення
      } else {
        setTonBalance(0); // Якщо даних немає, встановлюємо 0
      }
    } catch (err) {
      console.error("Unexpected error fetching TON balance:", err);
      toast.error("An unexpected error occurred while loading TON balance.");
      setTonBalance(0);
    }
  };

  useEffect(() => {
    // Завантажуємо баланс TON при завантаженні компонента та при зміні userId
    fetchTonBalance();

    if (initDataState?.user) {
      const user = initDataState.user;
      console.log('User data before saving:', user);
    }
  }, [userId, initDataState?.user]); // Додаємо userId до залежностей, щоб перезавантажувати при його зміні

  return (
    <div className='top-bar'
    style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: 50,
        backgroundColor: "#121015",
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
          {/* Змінено іконку та відображення балансу TON */}
          {/* Можна використати img для SVG, якщо tonSvg - це шлях */}
          {/* <img src={tonSvg.src} alt="TON" style={{ width: 16, height: 16, marginRight: 5 }} /> */}
          <span>💎</span> {/* Використовуємо емодзі або іншу іконку */}
          <span> {tonBalance.toFixed(4)} TON</span> {/* Відображаємо баланс TON, округлюючи до 4 знаків */}
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
        {/* Це місце для другого значення, можливо, це було раніше для тестових цілей */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>🪙</span>
          <span> 0 </span> {/* Залишаємо 0, якщо це placeholder */}
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
          <span> {points} </span>
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