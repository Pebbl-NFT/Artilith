// src/app/trade/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Placeholder, List, Button, Input } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useRouter } from 'next/navigation';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { toast } from 'react-hot-toast';

import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';
import InventoryItemSlot from '@/components/Item/InventoryItemSlot';
import { MergedInventoryItem, fetchInventory } from '@/hooks/useInventory';

// --- Типи ---
interface ListingItemInfo {
  id: number; // item_id
  name: string;
  image_url: string | null;
  rarity: string;
  item_key: string | null;
  item_type: string;
  sub_type: string | null;
  stats: any;
}
interface MarketListing {
  id: number; // listing_id
  price_points: number;
  items: ListingItemInfo;
}

export default function TradePage() {
    const router = useRouter();
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;

    const [listings, setListings] = useState<MarketListing[]>([]);
    const [userInventory, setUserInventory] = useState<MergedInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'buy' | 'sell'>('buy');
    const [points, setPoints] = useState(0);

    const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
    const [itemToSell, setItemToSell] = useState<MergedInventoryItem | null>(null);
    const [sellPrice, setSellPrice] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Єдина функція для завантаження даних
    const loadPageData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        const { data: listingsData, error: listingsError } = await supabase
            .from('market_listings')
            .select(`*, items!market_listings_item_id_fkey ( * )`)
            .eq('is_active', true)
            .neq('seller_id', String(userId))
            .order('created_at', { ascending: false });
            console.log('Дані з Supabase:', listingsData);
            console.error('Помилка з Supabase:', listingsError);

        if (listingsError) {
            console.error("Помилка завантаження лотів:", listingsError);
            toast.error("Не вдалося завантажити лоти.");
        } else if (listingsData) {
            // Просто передаємо дані напряму, оскільки їх структура вже правильна.
            // Додатково відфільтруємо лоти, у яких з якоїсь причини відсутній предмет.
            const validListings = listingsData.filter(listing => listing.items);
            setListings(validListings as MarketListing[]);
        }

        if (view === 'sell') {
            const inventoryData = await fetchInventory(String(userId));
            setUserInventory(inventoryData.filter(item => !item.equipped && !item.is_listed));
        }

        const { data: userData } = await supabase.from('users').select('points').eq('id', String(userId)).single();
        if (userData) setPoints(userData.points);
        
        setLoading(false);
    }, [userId, view]);

    useEffect(() => {
        loadPageData();
    }, [view, loadPageData]);

    const handlePurchase = async () => {
        if (!selectedListing || !userId) return;
        setIsProcessing(true);
        toast.loading("Купуємо...");

        const { error } = await supabase.rpc('purchase_market_listing', { p_listing_id: selectedListing.id });
        
        toast.dismiss();
        if (error) {
            toast.error(`Помилка: ${error.message}`);
        } else {
            toast.success("Предмет успішно куплено!");
        }
        
        setSelectedListing(null);
        await loadPageData();
        setIsProcessing(false);
    };

     const handleList_item = async () => {
     const price = parseInt(sellPrice, 10);
     if (!itemToSell || !price || price <= 0) {
         toast.error("Введіть ціну, більшу за нуль.");
         return;
     }
     // Переконуємось, що userId існує
     if (!userId) {
        toast.error("Не вдалося визначити користувача. Спробуйте перезапустити додаток.");
        return;
     }

     setIsProcessing(true);
     toast.loading("Виставляємо лот...");

     // === ЗМІНА ТУТ ===
     // Додаємо p_user_id до виклику функції
     const { error } = await supabase.rpc('create_market_listing', { 
         p_user_id: String(userId), // Передаємо ID користувача з Telegram
         p_inventory_id: itemToSell.id,
         p_price_points: price 
     });

     toast.dismiss();
     if (error) {
         toast.error(`Помилка: ${error.message}`);
     } else {
         toast.success("Ваш лот виставлено на ринок!");
     }

     setItemToSell(null);
     setSellPrice('');
     await loadPageData();
     setIsProcessing(false);
   };

    return (
        <Page back={() => router.push('/home')}> 
            <List>
                <TopBar points={points} />
                <div style={{ padding: '70px 15px 100px 15px', color: 'white' }}> 
                    <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>Торговий Майданчик</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Button mode={view === 'buy' ? 'filled' : 'bezeled'} onClick={() => setView('buy')}>Купити</Button>
                        <Button mode={view === 'sell' ? 'filled' : 'bezeled'} onClick={() => setView('sell')}>Продати</Button>
                    </div>

                    {loading && <Placeholder>Завантаження...</Placeholder>}

                    {view === 'buy' && !loading && (
                        <div className="item-grid">
                            {listings.length > 0 
                                ? listings.map(listing => (
                                    <MarketListingCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />
                                ))
                                : <p className="grid-placeholder">На ринку порожньо.</p>
                            }
                        </div>
                    )}

                    {view === 'sell' && !loading && (
                         <div className="item-grid">
                            {userInventory.map(item => (
                                <InventoryItemSlot key={item.id} item={item} onClick={() => setItemToSell(item)} />
                            ))}
                         </div>
                    )}
                </div>
                <BottomBar activeTab={"city"} setActiveTab={() => router.push('/home')} />
            </List>

            {/* Модальне вікно для підтвердження покупки */}
            {selectedListing && (
                <div className="modal-overlay" onClick={() => !isProcessing && setSelectedListing(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Підтвердити покупку?</h3>
                        <p>Предмет: <strong className={`rarity-font-${selectedListing.items.rarity?.toLowerCase()}`}>{selectedListing.items.name}</strong></p>
                        <p>Ціна: <strong>{selectedListing.price_points} 🪨</strong></p>
                        <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                            <Button size="l" stretched mode="gray" onClick={() => setSelectedListing(null)} disabled={isProcessing}>Скасувати</Button>
                            <Button size="l" stretched mode="filled" onClick={handlePurchase} loading={isProcessing}>Купити</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальне вікно для виставлення на продаж */}
            {/* Модальне вікно для виставлення на продаж */}
            {itemToSell && (
                <div className="modal-overlay" onClick={() => !isProcessing && setItemToSell(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Виставити на продаж</h3>
                        <p className={`rarity-font-${itemToSell.rarity?.toLowerCase()}`}>{itemToSell.name}</p>

                        {/* Перевіряємо, чи можна продати предмет */}
                        {itemToSell.is_listed || itemToSell.equipped ? (
                            <p style={{ color: 'orange', margin: '15px 0' }}>
                                {itemToSell.is_listed ? "Цей предмет уже на ринку." : "Неможливо продати екіпірований предмет."}
                            </p>
                        ) : (
                            <>
                                <Input
                                    type="number"
                                    placeholder="Ціна в 🪨"
                                    value={sellPrice}
                                    onChange={(e) => setSellPrice(e.target.value)}
                                    style={{width: '100%', margin: '15px 0'}}
                                />
                                <Button size="l" stretched onClick={handleList_item} loading={isProcessing}>
                                    Виставити
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Page>
    );
};

// --- ОНОВЛЕНИЙ КОМПОНЕНТ-АДАПТЕР ---
const MarketListingCard = ({ listing, onClick }: { listing: MarketListing; onClick: () => void }) => {
    if (!listing.items) {
        return null; 
    }
    
    const itemForSlot: MergedInventoryItem = {
        id: listing.items.id,
        item_id: listing.items.id,
        name: listing.items.name,
        image_url: listing.items.image_url ?? '',
        rarity: listing.items.rarity,
        item_key: listing.items.item_key ?? '',
        item_type: listing.items.item_type,
        sub_type: listing.items.sub_type ?? '',
        stats: listing.items.stats ?? {},
        equipped: false,
        quantity: 1,
        upgrade_level: 0,
        is_listed: true,
    };
    
    return (
        <div onClick={onClick}>
            <InventoryItemSlot 
                item={itemForSlot}
                price={listing.price_points} // Передаємо ціну як окремий пропс
                onClick={() => {}} // Внутрішній onClick нам не потрібен, бо ми обробляємо клік на div-обгортці
            />
        </div>
    );
}