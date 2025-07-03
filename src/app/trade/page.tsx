"use client";
import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Placeholder, List } from '@telegram-apps/telegram-ui';
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
  id: number; name: string; image_url: string | null; rarity: string;
  item_key: string | null; item_type: string; sub_type: string | null; stats: any;
}
interface MarketListing {
  id: number; price_points: number; items: ListingItemInfo;
}

// === НОВІ СТИЛІ ДЛЯ СТОРІНКИ ===
const styles: { [key: string]: CSSProperties } = {
  pageContainer: {
    minHeight: '100vh',
    backgroundImage: `url('/bg/market_bg.jpg')`, // Покладіть сюди тематичний фон
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    color: '#e0e7ff',
    fontFamily: "'Spectral', serif",
  },
  contentWrapper: {
    padding: '70px 15px 100px 15px',
  },
  title: {
    fontFamily: "'Cinzel', serif", // Більш фентезійний шрифт для заголовків
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '20px',
    color: '#fefce8',
    textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)',
  },
  viewSwitcher: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '30px',
    background: 'rgba(10, 5, 20, 0.5)',
    borderRadius: '12px',
    padding: '5px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
  },
  switcherButton: {
    flex: 1,
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    color: '#a7b3d9',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '8px',
    fontWeight: 'bold',
  },
  activeButton: {
    background: 'rgba(129, 140, 248, 0.2)',
    color: '#fefce8',
    boxShadow: 'inset 0 0 10px rgba(129, 140, 248, 0.3)',
  },
  gridContainer: {
    padding: '20px',
    background: 'rgba(10, 5, 20, 0.6)',
    backdropFilter: 'blur(5px)',
    borderRadius: '12px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
    minHeight: '300px',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(10, 5, 20, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modalContent: {
    background: `url('/bg/parchment_bg.jpg')`, // Текстура пергаменту
    backgroundSize: 'cover',
    color: '#2c1d12',
    padding: '30px',
    borderRadius: '8px',
    border: '2px solid #5a3a22',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  modalTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.8rem',
    marginBottom: '15px',
  },
  modalItemName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  modalInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #8c6b52',
    borderRadius: '6px',
    background: 'rgba(255, 250, 230, 0.8)',
    textAlign: 'center',
    fontSize: '1.5rem',
    color: '#2c1d12',
    fontWeight: 'bold',
    margin: '15px 0',
  },
  modalButton: {
    width: '100%',
    padding: '15px',
    border: '2px solid #2c1d12',
    borderRadius: '8px',
    background: '#5a3a22',
    color: '#fefce8',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  modalButtonSecondary: {
    background: 'transparent',
    border: 'none',
    color: '#5a3a22',
    marginTop: '15px',
    cursor: 'pointer',
  }
};

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
        <Page>
            <div style={styles.pageContainer}>
                <List>
                    <TopBar points={points} />
                    <div style={styles.contentWrapper}> 
                        <h2 style={styles.title}>Торговий Майданчик</h2>
                        
                        <div style={styles.viewSwitcher}>
                            <button 
                                style={{ ...styles.switcherButton, ...(view === 'buy' ? styles.activeButton : {}) }} 
                                onClick={() => setView('buy')}
                            >
                                Купити
                            </button>
                            <button 
                                style={{ ...styles.switcherButton, ...(view === 'sell' ? styles.activeButton : {}) }} 
                                onClick={() => setView('sell')}
                            >
                                Продати
                            </button>
                        </div>
                        
                        <div style={styles.gridContainer}>
                            {loading && <Placeholder>Пошук товарів...</Placeholder>}
                            
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
                                    {userInventory.length > 0 
                                        ? userInventory.map(item => (
                                            <InventoryItemSlot key={item.id} item={item} onClick={() => setItemToSell(item)} />
                                        ))
                                        : <p className="grid-placeholder">У вас немає предметів для продажу.</p>
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                    <BottomBar activeTab={"city"} setActiveTab={() => router.push('/home')} />
                </List>
            </div>

            {/* Модальне вікно для підтвердження покупки */}
            {selectedListing && (
                <div style={styles.modalOverlay} onClick={() => !isProcessing && setSelectedListing(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Придбати предмет</h3>
                        <p style={styles.modalItemName} className={`rarity-font-${selectedListing.items.rarity?.toLowerCase()}`}>{selectedListing.items.name}</p>
                        <p>Ціна: <strong>{selectedListing.price_points} 🪨</strong></p>
                        <div style={{marginTop: '20px'}}>
                            <button style={styles.modalButton} onClick={handlePurchase} disabled={isProcessing}>
                                {isProcessing ? 'Купуємо...' : 'Купити'}
                            </button>
                            <button style={styles.modalButtonSecondary} onClick={() => setSelectedListing(null)} disabled={isProcessing}>
                                Скасувати
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальне вікно для виставлення на продаж */}
            {itemToSell && (
                <div style={styles.modalOverlay} onClick={() => !isProcessing && setItemToSell(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Виставити на продаж</h3>
                        <p style={styles.modalItemName} className={`rarity-font-${itemToSell.rarity?.toLowerCase()}`}>{itemToSell.name}</p>
                        <input
                            type="number"
                            placeholder="Ваша ціна"
                            value={sellPrice}
                            onChange={(e) => setSellPrice(e.target.value)}
                            style={styles.modalInput}
                        />
                        <button style={styles.modalButton} onClick={handleList_item} disabled={isProcessing}>
                            {isProcessing ? 'Виставляємо...' : 'На ринок'}
                        </button>
                         <button style={styles.modalButtonSecondary} onClick={() => setItemToSell(null)} disabled={isProcessing}>
                            Скасувати
                        </button>
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