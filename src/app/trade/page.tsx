// src/app/trade/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Placeholder, List } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useRouter } from 'next/navigation';
import { useSignal, initData } from '@telegram-apps/sdk-react';

// Імпортуємо ваші головні компоненти навігації
import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';

// TODO: Створити правильний тип
type MarketListing = any;

export default function TradePage() {
    const router = useRouter();
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;

    const [listings, setListings] = useState<MarketListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'buy' | 'sell'>('buy');
    
    // --- НОВИЙ БЛОК: Завантажуємо дані для TopBar ---
    const [points, setPoints] = useState(0);
    useEffect(() => {
        if (!userId) return;
        
        const fetchUserData = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('points')
                .eq('id', String(userId))
                .single();
            
            if (data) {
                setPoints(data.points);
            }
        };
        fetchUserData();
    }, [userId]);
    // -----------------------------------------

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('market_listings')
                .select(`*, items ( name, image_url, rarity )`)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching market listings:", error);
            } else {
                setListings(data as any[]);
            }
            setLoading(false);
        };

        if (view === 'buy') {
            fetchListings();
        } else {
            // TODO: Логіка для вкладки "Продати"
            setLoading(false);
        }
    }, [view]);

    return (
        // --- НОВА СТРУКТУРА: Обгортаємо все в Page та List ---
        <Page back={() => router.push('/home')}> 
            <List>
                {/* 1. Додаємо TopBar */}
                <TopBar points={points} />

                {/* Основний контент сторінки з відступами */}
                <div style={{ padding: '70px 20px 100px 20px', color: 'white' }}> 
                    <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>Торговий Майданчик</h2>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                        <button onClick={() => setView('buy')} style={{ opacity: view === 'buy' ? 1 : 0.6 }}>Купити</button>
                        <button onClick={() => setView('sell')} style={{ opacity: view === 'sell' ? 1 : 0.6 }}>Продати</button>
                    </div>

                    {loading && <Placeholder>Завантаження лотів...</Placeholder>}

                    {view === 'buy' && !loading && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {listings.length > 0 
                                ? listings.map(listing => (
                                    <div key={listing.id} style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px' }}>
                                        <div style={{position: 'relative', width: '100%', aspectRatio: '1/1'}}>
                                            {listing.items.image_url && 
                                                <Image src={listing.items.image_url} alt={listing.items.name} fill style={{ objectFit: 'contain', borderRadius: '4px' }} />
                                            }
                                        </div>
                                        <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '5px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{listing.items.name}</p>
                                        <p style={{ textAlign: 'center', fontSize: '12px', color: '#00ffc8' }}>
                                            Ціна: {listing.price_points} 🪨
                                        </p>
                                    </div>
                                ))
                                : <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>На ринку порожньо.</p>
                            }
                        </div>
                    )}

                    {view === 'sell' && !loading && (
                         <div style={{ textAlign: 'center' }}>
                            <p>Тут буде ваш інвентар і можливість виставити предмет на продаж.</p>
                         </div>
                    )}
                </div>

                {/* 2. Додаємо BottomBar */}
                <BottomBar 
                    activeTab={"city"} // Вважаємо, що "Торгівля" - це частина "Міста"
                    setActiveTab={(tab) => router.push('/home')} // Будь-яка кнопка повертає на головну
                />
            </List>
        </Page>
    );
};