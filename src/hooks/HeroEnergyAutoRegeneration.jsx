
import { useEffect, useRef, useState } from "react";

// Таймер енергії для автозарахування кожні 5 хвилин
function useEnergyRegen({ userId, energy, setEnergy, maxEnergy, supabase }) {
  // Для попередження багів під час асинхронних апдейтів використаємо ref
  const timerRef = useRef(null);
  const [isAtMax, setIsAtMax] = useState(false);

  useEffect(() => {
    // Якщо ми досягли максимуму — таймер не потрібен
    setIsAtMax(energy >= maxEnergy);

    // Якщо енергія вже максимальна, зупиняємо/не запускаємо таймер
    if (energy >= maxEnergy) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Функція, що виконується кожні 5 хвилин
    timerRef.current = setInterval(async () => {
      // Перевіряємо ще раз для певності (раптом змінилося)
      if (energy < maxEnergy) {
        const newEnergy = energy + 1;
        setEnergy(newEnergy);

        // Апдейтимо на бекенді Supabase
        if (userId) {
          const { error } = await supabase
            .from("users")
            .upsert([{ id: userId, energy: newEnergy }], { onConflict: "id" });
          if (error) {
            // Ви можете додати toast з помилкою
            // toast.error("Не вдалося оновити енергію");
            console.error("Помилка оновлення енергії:", error);
          }
        }
      } 
    }, 14000); // 5 хвилин = 300 000 мс

    // Очищуємо інтервал при розмонтуванні або зміні енергії/макс енергії
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [userId, energy, maxEnergy, supabase, setEnergy]);

  return isAtMax;
}

// Додаємо в головний компонент (або туди, де відображаєте енергію та автореген)
const maxEnergy = 20; // Можна винести у конфіг
// energy, setEnergy, userId, supabase - вже існують у вашому стані/component

function HeroEnergyAutoRegeneration({ userId, energy, setEnergy, supabase }) {
  // Після отримання з БД поточного energy

  // Підключаємо хук
  const isAtMax = useEnergyRegen({
    userId,
    energy,
    setEnergy,
    maxEnergy,
    supabase,
  });

  // Для анімації оновлення енергії
  const [energyAnim, setEnergyAnim] = useState(false);

  // Додаємо анімований ефект на зміну енергії
  useEffect(() => {
    setEnergyAnim(true);
    // За 1с повертаємо у норму
    const timeout = setTimeout(() => setEnergyAnim(false), 1000);
    return () => clearTimeout(timeout);
  }, [energy]);

  // При досягненні максимуму — можна показати тост/повідомлення
  useEffect(() => {
    if (isAtMax) {
      // toast.info("Енергія заповнена!");
    }
  }, [isAtMax]);

  return (
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
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <span>⚡</span>
        <span
          className={`${energyAnim ? "energy-anim" : ""}`}
          style={{
            fontWeight: "bold",
            color: energy >= maxEnergy ? "#22d3ee" : "#ffe066",
            transition: "color 0.4s, transform 0.4s",
            transform: energyAnim ? "scale(1.25)" : "scale(1)"
          }}
        >
          {energy}
        </span>
        {/* Позначка максимуму енергії */}
        {energy >= maxEnergy && (
          <span
            aria-label="Максимальна енергія"
            style={{
              marginLeft: 6,
              fontSize: 10,
              color: "#48e19f",
              fontWeight: 600,
              transition: "color 0.2s",
            }}
          >
            MAX
          </span>
        )}
      </div>
      {/* Стили для анімації */}
      <style>
        {`
        .energy-anim {
          animation: pulseEnergy .8s cubic-bezier(.4,0,.2,1);
        }
        @keyframes pulseEnergy {
          0% { transform: scale(1); filter: brightness(1.32);}
          40% { transform: scale(1.3); filter: brightness(2);}
          100% { transform: scale(1); filter: brightness(1);}
        }
        `}
      </style>
    </div>
  );
}

export default HeroEnergyAutoRegeneration;