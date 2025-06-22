"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/lib/supabaseClient';
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import { toast } from 'react-hot-toast';
import Image from "next/image";
import { useRouter } from 'next/navigation';

// Шляхи до ваших зображень
import victim from '@/app/_assets/victim.png';
import travel from '@/app/_assets/travel.png';

// Допоміжна функція для форматування часу
const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

interface Reward {
    type: 'common' | 'uncommon' | 'rare';
    points: number;
    energy: number;
    item_name: string | null;
    atl: number;
}

export function Fountain() {
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;
    const router = useRouter(); // <-- НАШІ ЗМІНИ: Додано хук для навігації

    const [status, setStatus] = useState<'loading' | 'ready' | 'cooldown'>('loading');
    const [cooldown, setCooldown] = useState(0);
    const [isClaiming, setIsClaiming] = useState(false);

    // Функція для перевірки стану фонтану
    const checkFountainStatus = useCallback(async () => {
        if (!userId) return;
        setStatus('loading');
        const { data, error } = await supabase
            .from('users')
            .select('last_fountain_claim_at')
            .eq('id', String(userId))
            .single();

        if (error) {
            console.error("Помилка отримання даних фонтану:", error);
            setStatus('ready'); // Встановлюємо 'ready' у разі помилки, щоб користувач міг спробувати
            return;
        }

        const lastClaimTime = data?.last_fountain_claim_at ? new Date(data.last_fountain_claim_at).getTime() : 0;
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const timeSinceLastClaim = now - lastClaimTime;

        if (timeSinceLastClaim >= twentyFourHours) {
            setStatus('ready');
            setCooldown(0);
        } else {
            setStatus('cooldown');
            setCooldown(Math.round((twentyFourHours - timeSinceLastClaim) / 1000));
        }
    }, [userId]);

    // Первинна перевірка статусу при завантаженні компонента
    useEffect(() => {
        checkFountainStatus();
    }, [checkFountainStatus]);

    // Таймер зворотного відліку
    useEffect(() => {
        if (status === 'cooldown' && cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setStatus('ready');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status, cooldown]);

    // Функція отримання нагороди
    const handleClaim = async () => {
        if (!userId || isClaiming) return;
        setIsClaiming(true);
        toast.loading('Звертаємось до духів...');

        const { data, error } = await supabase.rpc('claim_fountain_reward', { p_user_id: String(userId) });
        toast.dismiss();

        if (error || !data.success) {
            toast.error(data?.message || 'Щось пішло не так. Спробуйте пізніше.');
            setIsClaiming(false);
            return;
        }

        const reward: Reward = data.reward;
        let rewardMessages = [];
        if (reward.points > 0) rewardMessages.push(`${reward.points} 🪨`);
        if (reward.energy > 0) rewardMessages.push(`${reward.energy} ⚡`);
        if (reward.atl > 0) rewardMessages.push(`${reward.atl} 🪙`);
        if (reward.item_name) rewardMessages.push(`1x "${reward.item_name}"`);

        toast.success(`Ви отримали: ${rewardMessages.join(', ')}!`, { duration: 4000 });
        
        checkFountainStatus();
        setIsClaiming(false);
    };

    const buttonText = status === 'ready' ? "Отримати дари!" : formatTime(cooldown);
    const isButtonDisabled = status !== 'ready' || isClaiming;

    // <-- НАШІ ЗМІНИ: Оновлено всю JSX структуру
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', padding: '0 16px', boxSizing: 'border-box' }}>
            
            {/* --- БЛОК ДЖЕРЕЛА ДАРІВ --- */}
            <Placeholder
                header="Джерело Дарів"
                description="Раз на день духи дарують сміливцям цінні ресурси. Випробуй свою удачу!"
                style={{ width: '100%', marginTop: '20px' }}
            >
                <Image
                    alt="Джерело Дарів"
                    src={victim}
                    width={96}
                    height={96}
                    style={{ marginBottom: '16px' }}
                />
                <Button
                    size="l"
                    stretched
                    onClick={handleClaim}
                    disabled={isButtonDisabled}
                    loading={status === 'loading' || isClaiming}
                >
                    {status === 'loading' ? 'Перевірка...' : buttonText}
                </Button>
            </Placeholder>

            {/* --- БЛОК ПОДОРОЖІ (БІЙ) --- */}
            <Placeholder
                 header="Подорож у невідоме"
                 description="Вирушайте в подорож, щоб здобути досвід та славу."
                 style={{ width: '100%'}}
            >
                <Image
                    alt="Подорож"
                    src={travel}
                    width={96}
                    height={96}
                    style={{ marginBottom: '16px' }}
                />
                <div style={{ color: '#999', marginBottom: '16px', fontFamily: 'monospace' }}>
                    Нагорода: +🪨 +🔷 | Ціна: -1⚡
                </div>
                <Button
                    size="l"
                    stretched
                    onClick={() => router.push('/home/battle')}
                >
                    ⚔️ В подорож ⚔️
                </Button>
            </Placeholder>

        </div>
    );
}