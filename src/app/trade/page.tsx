"use client";
import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
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

// --- Оновлені типи ---
type Currency = 'points' | 'atl_balance' | 'ton_balance';

interface ListingItemInfo {
  id: number; name: string; image_url: string | null; rarity: string;
  item_key: string | null; item_type: string; sub_type: string | null; stats: any;
}
interface MarketListing {
  id: number;
  currency: Currency;
  price_points: number | null;
  price_atl: number | null;
  price_ton: number | null;
  items: ListingItemInfo;
}

// === Стилі (додано стилі для кнопок валют) ===
const styles: { [key: string]: CSSProperties } = {
  pageContainer: { minHeight: '100vh', backgroundImage: `url('/bg/market_bg.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e0e7ff', fontFamily: "'Spectral', serif", },
  contentWrapper: { padding: '70px 15px 100px 15px', },
  title: { fontFamily: "'Cinzel', serif", textAlign: 'center', fontSize: '2rem', marginBottom: '20px', color: '#fefce8', textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)', },
  viewSwitcher: { display: 'flex', justifyContent: 'center', marginBottom: '30px', background: 'rgba(10, 5, 20, 0.5)', borderRadius: '12px', padding: '5px', border: '1px solid rgba(129, 140, 248, 0.2)', },
  switcherButton: { flex: 1, padding: '10px 20px', background: 'transparent', border: 'none', color: '#a7b3d9', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease', borderRadius: '8px', fontWeight: 'bold', },
  activeButton: { background: 'rgba(129, 140, 248, 0.2)', color: '#fefce8', boxShadow: 'inset 0 0 10px rgba(129, 140, 248, 0.3)', },
  gridContainer: { padding: '20px', background: 'rgba(10, 5, 20, 0.6)', backdropFilter: 'blur(5px)', borderRadius: '12px', border: '1px solid rgba(129, 140, 248, 0.2)', minHeight: '300px', },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 5, 20, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, },
  modalContent: { background: `url('/bg/parchment_bg.jpg')`, backgroundSize: 'cover', color: '#2c1d12', padding: '30px', borderRadius: '8px', border: '2px solid #5a3a22', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '90%', maxWidth: '400px', textAlign: 'center', },
  modalTitle: { fontFamily: "'Cinzel', serif", fontSize: '1.8rem', marginBottom: '15px', },
  modalItemName: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', },
  modalInput: { width: '100%', padding: '12px', border: '2px solid #8c6b52', borderRadius: '6px', background: 'rgba(255, 250, 230, 0.8)', textAlign: 'center', fontSize: '1.5rem', color: '#2c1d12', fontWeight: 'bold', margin: '15px 0', },
  modalButton: { width: '100%', padding: '15px', border: '2px solid #2c1d12', borderRadius: '8px', background: '#5a3a22', color: '#fefce8', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', },
  modalButtonSecondary: { background: 'transparent', border: 'none', color: '#5a3a22', marginTop: '15px', cursor: 'pointer', },
  currencySelector: { display: 'flex', justifyContent: 'space-around', margin: '20px 0', },
  currencyButton: { padding: '10px 15px', border: '2px solid #8c6b52', background: 'rgba(255, 250, 230, 0.8)', borderRadius: '8px', cursor: 'pointer', fontSize: '1.5rem', },
  activeCurrencyButton: { background: '#5a3a22', color: '#fefce8', borderColor: '#2c1d12' },
};

// --- Хелпер для відображення ціни ---
const getPriceDisplay = (listing: MarketListing): { price: number; icon: string } => {
    switch (listing.currency) {
        case 'points': return { price: listing.price_points ?? 0, icon: '🪨' };
        case 'atl_balance': return { price: listing.price_atl ?? 0, icon: '🪙' };
        case 'ton_balance': return { price: listing.price_ton ?? 0, icon: '💎' };
        default: return { price: 0, icon: '' };
    }
}

export default function TradePage() {
    const router = useRouter();
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [userInventory, setUserInventory] = useState<MergedInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'buy' | 'sell'>('buy');
    const [balances, setBalances] = useState({ points: 0, atl_balance: 0, ton_balance: 0 });
    const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
    const [itemToSell, setItemToSell] = useState<MergedInventoryItem | null>(null);
    const [sellPrice, setSellPrice] = useState('');
    const [sellCurrency, setSellCurrency] = useState<Currency>('points');
    const [isProcessing, setIsProcessing] = useState(false);

    const loadPageData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        const { data: listingsData, error: listingsError } = await supabase
            .from('market_listings')
            .select(`*, items!market_listings_item_id_fkey ( * )`)
            .eq('is_active', true)
            .neq('seller_id', String(userId))
            .order('created_at', { ascending: false });

        if (listingsError) {
            console.error("Помилка завантаження лотів:", listingsError);
            toast.error("Не вдалося завантажити лоти.");
        } else if (listingsData) {
            const validListings = listingsData.filter(listing => listing.items);
            setListings(validListings as MarketListing[]);
        }

        if (view === 'sell') {
            const inventoryData = await fetchInventory(String(userId));
            setUserInventory(inventoryData.filter(item => !item.equipped && !item.is_listed));
        }

        const { data: userData } = await supabase.from('users').select('points, atl_balance, ton_balance').eq('id', String(userId)).single();
        if (userData) setBalances(userData as { points: number; atl_balance: number; ton_balance: number });
        
        setLoading(false);
    }, [userId, view]);

    useEffect(() => {
        loadPageData();
    }, [view, loadPageData]);

    const handlePurchase = async () => {
        if (!selectedListing || !userId) return;
        setIsProcessing(true);
        toast.loading("Купуємо...");

        const { error } = await supabase.rpc('purchase_market_listing', { 
            p_listing_id: selectedListing.id,
            p_buyer_id: String(userId) // <-- ВАЖЛИВО: передаємо ID покупця
        });
        
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

    const handleListItem = async () => {
        const price = parseFloat(sellPrice);
        if (!itemToSell || !price || price <= 0) {
            toast.error("Введіть ціну, більшу за нуль.");
            return;
        }
        if (!userId) {
            toast.error("Не вдалося визначити користувача.");
            return;
        }

        setIsProcessing(true);
        toast.loading("Виставляємо лот...");
        
        const params = {
            p_user_id: String(userId),
            p_inventory_id: itemToSell.id,
            p_currency: sellCurrency,
            p_price_points: sellCurrency === 'points' ? Math.round(price) : null,
            p_price_atl: sellCurrency === 'atl_balance' ? price : null,
            p_price_ton: sellCurrency === 'ton_balance' ? price : null,
        };

        const { error } = await supabase.rpc('create_market_listing', params);

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
                    <TopBar points={balances.points} />
                    <div style={styles.contentWrapper}> 
                        <h2 style={styles.title}>Торговий Майданчик</h2>
                        
                        <div style={styles.viewSwitcher}>
                            <button style={{ ...styles.switcherButton, ...(view === 'buy' ? styles.activeButton : {}) }} onClick={() => setView('buy')}>Купити</button>
                            <button style={{ ...styles.switcherButton, ...(view === 'sell' ? styles.activeButton : {}) }} onClick={() => setView('sell')}>Продати</button>
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

            {selectedListing && (
                <div style={styles.modalOverlay} onClick={() => !isProcessing && setSelectedListing(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Придбати предмет</h3>
                        <p style={styles.modalItemName} className={`rarity-font-${selectedListing.items.rarity?.toLowerCase()}`}>{selectedListing.items.name}</p>
                        <p>Ціна: <strong>{getPriceDisplay(selectedListing).price} {getPriceDisplay(selectedListing).icon}</strong></p>
                        <div style={{marginTop: '20px'}}>
                            <button style={styles.modalButton} onClick={handlePurchase} disabled={isProcessing}>{isProcessing ? 'Купуємо...' : 'Купити'}</button>
                            <button style={styles.modalButtonSecondary} onClick={() => setSelectedListing(null)} disabled={isProcessing}>Скасувати</button>
                        </div>
                    </div>
                </div>
            )}

            {itemToSell && (
                <div style={styles.modalOverlay} onClick={() => !isProcessing && setItemToSell(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Виставити на продаж</h3>
                        <p style={styles.modalItemName} className={`rarity-font-${itemToSell.rarity?.toLowerCase()}`}>{itemToSell.name}</p>
                        
                        <div style={styles.currencySelector}>
                            {(['points', 'atl_balance', 'ton_balance'] as Currency[]).map(c => (
                                <button key={c} onClick={() => setSellCurrency(c)} style={{...styles.currencyButton, ...(sellCurrency === c ? styles.activeCurrencyButton : {})}}>
                                    {c === 'points' ? '🪨' : c === 'atl_balance' ? '🪙' : '💎'}
                                </button>
                            ))}
                        </div>
                        
                        <input type="number" placeholder="Ваша ціна" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} style={styles.modalInput} />
                        
                        <button style={styles.modalButton} onClick={handleListItem} disabled={isProcessing}>{isProcessing ? 'Виставляємо...' : 'На ринок'}</button>
                        <button style={styles.modalButtonSecondary} onClick={() => setItemToSell(null)} disabled={isProcessing}>Скасувати</button>
                    </div>
                </div>
            )}
        </Page>
    );
};

// --- Оновлений компонент-адаптер ---
const MarketListingCard = ({ listing, onClick }: { listing: MarketListing; onClick: () => void }) => {
    if (!listing.items) return null; 
    
    const { price, icon } = getPriceDisplay(listing);
    
    const itemForSlot: MergedInventoryItem = {
        id: listing.items.id, item_id: listing.items.id, name: listing.items.name, image_url: listing.items.image_url ?? '',
        rarity: listing.items.rarity, item_key: listing.items.item_key ?? '', item_type: listing.items.item_type,
        sub_type: listing.items.sub_type ?? '', stats: listing.items.stats ?? {}, equipped: false, quantity: 1, upgrade_level: 0, is_listed: true,
    };
    
    return (
        <div onClick={onClick}>
            <InventoryItemSlot 
                item={itemForSlot}
                price={price}
                priceCurrencyIcon={icon}
                onClick={() => {}} // Внутрішній onClick не потрібен, оскільки ми обробляємо клік на div-обгортці
            />
        </div>
    );
}