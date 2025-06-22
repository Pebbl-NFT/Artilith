// src/components/HeroEnergyAutoRegeneration.jsx
import { useState, useEffect } from "react";
// Імпортуємо наш НОВИЙ хук, який керує всією логікою
import { useEnergySystem } from "@/hooks/useEnergySystem"; 

/**
 * Компонент, що відповідає ВИКЛЮЧНО за відображення енергії.
 */
function HeroEnergyAutoRegeneration({ userId, supabase }) {
    // Підключаємо хук, отримуємо з нього готові дані.
    // УСЯ складна логіка тепер живе всередині useEnergySystem.
    const { energy, maxEnergy, isLoading } = useEnergySystem(userId, supabase);

    // Ваша логіка для анімації залишається тут
    const [energyAnim, setEnergyAnim] = useState(false);
    useEffect(() => {
        if (!isLoading) {
            setEnergyAnim(true);
            const timeout = setTimeout(() => setEnergyAnim(false), 800);
            return () => clearTimeout(timeout);
        }
    }, [energy, isLoading]);

    // Показуємо завантажувач, поки йде перша синхронізація з сервером
    if (isLoading) {
        return (
            <div style={{ padding: 10, color: "#fff", minHeight: "24px" }}>
                <span>⚡ Завантаження...</span>
            </div>
        );
    }

    // Ваша JSX-розмітка залишається тут, як і була
    return (
        <div
            style={{
                display: "flex", flexDirection: "row", justifyContent: "center",
                alignItems: "center", gap: "30px", padding: 10, color: "#fff",
                animation: "fadeIn 0.6s ease forwards", minHeight: "24px"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", alignItems: "center" }}>
                <span>⚡</span>
                <span
                    className={`${energyAnim ? "energy-anim" : ""}`}
                    style={{
                        marginLeft: 8, fontWeight: "bold",
                        color: energy >= maxEnergy ? "#22d3ee" : "#ffe066",
                        transition: "color 0.4s, transform 0.4s",
                        transform: energyAnim ? "scale(1.25)" : "scale(1)"
                    }}
                >
                    {energy}
                </span>
                {energy >= maxEnergy && (
                    <span
                        aria-label="Максимальна енергія"
                        style={{
                            marginLeft: 6, fontSize: 10, color: "#48e19f",
                            fontWeight: 600, transition: "color 0.2s"
                        }}
                    >
                        MAX
                    </span>
                )}
            </div>
            <style>
                {`
                .energy-anim { animation: pulseEnergy .8s cubic-bezier(.4,0,.2,1); }
                @keyframes pulseEnergy {
                  0% { transform: scale(1); filter: brightness(1.32);}
                  40% { transform: scale(1.3); filter: brightness(2);}
                  100% { transform: scale(1); filter: brightness(1);}
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                `}
            </style>
        </div>
    );
}

export default HeroEnergyAutoRegeneration;