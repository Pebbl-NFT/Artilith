"use client";
import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Placeholder, List } from '@telegram-apps/telegram-ui';
import { Page } from "@/components/Page";
import { useRouter } from 'next/navigation';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { toast, Toaster } from 'react-hot-toast';

import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';
import InventoryItemSlot from '@/components/Item/InventoryItemSlot';
import { MergedInventoryItem, fetchInventory } from '@/hooks/useInventory';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// --- Типи ---
type Currency = 'points' | 'atl_balance' | 'ton_balance';
type ViewType = 'buy' | 'sell' | 'my_listings';
type SortOption = 'newest' | 'price_asc' | 'price_desc';

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

// --- Стилі ---
const styles: { [key: string]: CSSProperties } = {
  pageContainer: { minHeight: '100vh', backgroundImage: `url('/bg/market_bg.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e0e7ff', fontFamily: "'Spectral', serif", },
  contentWrapper: { padding: '70px 15px 100px 15px', },
  title: { fontFamily: "'Cinzel', serif", textAlign: 'center', fontSize: '2rem', marginBottom: '20px', color: '#fefce8', textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)', },
  viewSwitcher: { display: 'flex', justifyContent: 'center', marginBottom: '15px', background: 'rgba(10, 5, 20, 0.5)', borderRadius: '12px', padding: '5px', border: '1px solid rgba(129, 140, 248, 0.2)', },
  switcherButton: { flex: 1, padding: '10px 15px', background: 'transparent', border: 'none', color: '#a7b3d9', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease', borderRadius: '8px', fontWeight: 'bold', },
  activeButton: { background: 'rgba(129, 140, 248, 0.2)', color: '#fefce8', boxShadow: 'inset 0 0 10px rgba(129, 140, 248, 0.3)', },
  gridContainer: { padding: '20px', background: 'rgba(10, 5, 20, 0.6)', backdropFilter: 'blur(5px)', borderRadius: '12px', border: '1px solid rgba(129, 140, 248, 0.2)', minHeight: '300px', },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 5, 20, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, },
  modalContent: { background: `url('/bg/parchment_bg.jpg')`, backgroundSize: 'cover', color: '#2c1d12', padding: '30px', borderRadius: '8px', border: '2px solid #5a3a22', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '90%', maxWidth: '400px', textAlign: 'center', },
  modalTitle: { fontFamily: "'Cinzel', serif", fontSize: '1.8rem', marginBottom: '15px', },
  modalItemName: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', },
  modalInput: {
    width: '90%',                   // <--- ЗМІНА: Робимо поле трохи вужчим
    margin: '15px auto 25px auto',  // <--- ЗМІНА: 'auto' центрує поле по горизонталі
    padding: '12px',
    border: '2px solid #8c6b52',
    borderRadius: '6px',
    background: 'rgba(255, 250, 230, 0.8)',
    textAlign: 'center',
    fontSize: '1.5rem',
    color: '#2c1d12',
    fontWeight: 'bold',
    boxSizing: 'border-box',        // <--- ДОДАНО: Для правильного розрахунку ширини
},
  modalButton: { width: '100%', padding: '15px', border: '2px solid #2c1d12', borderRadius: '8px', background: '#5a3a22', color: '#fefce8', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', },
  modalButtonSecondary: { background: 'transparent', border: 'none', color: '#5a3a22', marginTop: '15px', cursor: 'pointer', },
  currencySelector: { display: 'flex', justifyContent: 'space-around', margin: '20px 0', },
  currencyButton: {
    padding: '10px', // Зменшено падінг для кращого вигляду з іконкою
    border: '2px solid #8c6b52',
    background: 'rgba(255, 250, 230, 0.8)',
    borderRadius: '8px',
    cursor: 'pointer',
    // Додано для центрування іконки
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '60px', // Фіксована висота
    width: '60px',  // Фіксована ширина
},
  activeCurrencyButton: { background: '#5a3a22', color: '#fefce8', borderColor: '#2c1d12' },
  filtersContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
  selectControl: { flex: 1, padding: '10px', background: 'rgba(10, 5, 20, 0.7)', border: '1px solid rgba(129, 140, 248, 0.2)', color: '#e0e7ff', borderRadius: '8px', fontSize: '1rem' },
  filterButtonGroup: {
    display: 'flex',
    background: 'rgba(10, 5, 20, 0.7)',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid rgba(129, 140, 248, 0.2)',
},
filterButton: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#a7b3d9',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
},
activeFilterButton: {
    background: 'rgba(129, 140, 248, 0.2)',
    color: '#fefce8',
},
};

const getPriceDisplay = (listing: MarketListing): { price: number; icon: React.ReactNode } => {
    switch (listing.currency) {
        // --- ЗМІНИ ТУТ ---
        case 'points': 
            return { 
                price: listing.price_points ?? 0, 
                icon: <img src="/coin/atl_s.png" alt="Points" width={14} height={14} /> 
            };
        case 'atl_balance': 
            return { 
                price: listing.price_atl ?? 0, 
                icon: <img src="/coin/atl_g.png" alt="ATL" width={14} height={14} /> 
            };
        case 'ton_balance': 
            return { 
                price: listing.price_ton ?? 0, 
                icon: '💎' // Залишаємо емодзі, бо іконки для TON немає
            };
        // --- КІНЕЦЬ ЗМІН ---
        default: 
            return { price: 0, icon: '' };
    }
}

export default function TradePage() {
    const router = useRouter();
    const initDataState = useSignal(initData.state);
    const userId = initDataState?.user?.id;

    // --- Стан ---
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [myListings, setMyListings] = useState<MarketListing[]>([]);
    const [userInventory, setUserInventory] = useState<MergedInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<ViewType>('buy');
    const [balances, setBalances] = useState({ points: 0, atl_balance: 0, ton_balance: 0 });
    const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
    const [itemToSell, setItemToSell] = useState<MergedInventoryItem | null>(null);
    const [sellPrice, setSellPrice] = useState('');
    const [sellCurrency, setSellCurrency] = useState<Currency>('points');
    const [isProcessing, setIsProcessing] = useState(false);
    const [sellQuantity, setSellQuantity] = useState('1');
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; message: React.ReactNode; onConfirm: () => void; } | null>(null);
    
    // --- Стан фільтрів ---
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [filterType, setFilterType] = useState('all');
    const [filterCurrency, setFilterCurrency] = useState('all'); // <-- Новий фільтр

    useEffect(() => { if (itemToSell) { setSellQuantity('1'); } }, [itemToSell]);

    const loadPageData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        const { data: userData } = await supabase.from('users').select('points, atl_balance, ton_balance').eq('id', String(userId)).single();
        if (userData) setBalances(userData as any);

        if (view === 'buy') {
            let query = supabase
                .from('market_listings')
                .select(`*, items!inner(*)`)
                .eq('is_active', true)
                .neq('seller_id', String(userId));
            
            if (filterType !== 'all') {
                query = query.eq('items.item_type', filterType);
            }

            // --- ОНОВЛЕНА ЛОГІКА ФІЛЬТРАЦІЇ ТА СОРТУВАННЯ ---
            if (filterCurrency !== 'all') {
                query = query.eq('currency', filterCurrency);
            }

            if (sortOption === 'newest') {
                query = query.order('created_at', { ascending: false });
            } else if (sortOption.startsWith('price_') && filterCurrency !== 'all') {
                const isAsc = sortOption === 'price_asc';
                let priceColumn: 'price_points' | 'price_atl' | 'price_ton' = 'price_points';
                
                if (filterCurrency === 'atl_balance') priceColumn = 'price_atl';
                else if (filterCurrency === 'ton_balance') priceColumn = 'price_ton';
                
                query = query.order(priceColumn, { ascending: isAsc });
            }

            const { data, error } = await query;
            if (error) {
                toast.error("Не вдалося завантажити лоти.");
            } else {
                setListings(data as MarketListing[]);
            }
        }
        
        if (view === 'sell') {
            const inventoryData = await fetchInventory(String(userId));
            setUserInventory(inventoryData.filter(item => !item.equipped && !item.is_listed));
        }

        if (view === 'my_listings') {
            const { data, error } = await supabase.from('market_listings').select(`*, items!inner(*)`).eq('is_active', true).eq('seller_id', String(userId)).order('created_at', { ascending: false });
            if (error) { toast.error("Не вдалося завантажити ваші лоти."); } 
            else { setMyListings(data as MarketListing[]); }
        }
        
        setLoading(false);
    }, [userId, view, sortOption, filterType, filterCurrency]); // <-- Додано filterCurrency в залежності

    useEffect(() => { loadPageData(); }, [loadPageData]);

    // --- Обробники подій ---
    const handlePurchase = async () => {
        if (!selectedListing || !userId) return;
        setIsProcessing(true);
        toast.loading("Купуємо...");
        const { error } = await supabase.rpc('purchase_market_listing', { p_listing_id: selectedListing.id, p_buyer_id: String(userId) });
        toast.dismiss();
        if (error) { toast.error(`Помилка: ${error.message}`); } 
        else { toast.success("Предмет успішно куплено!"); }
        setSelectedListing(null);
        await loadPageData();
        setIsProcessing(false);
    };

    const handleListItem = async () => {
        const price = parseFloat(sellPrice);
        const quantity = parseInt(sellQuantity, 10); // <-- Отримуємо кількість

        if (!itemToSell) return;
        if (!price || price <= 0) {
            toast.error("Введіть ціну, більшу за нуль.");
            return;
        }
        if (!quantity || quantity <= 0) {
            toast.error("Введіть кількість, більшу за нуль.");
            return;
        }
        if (quantity > itemToSell.quantity) {
            toast.error("У вас недостатньо предметів у стаку.");
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
            p_quantity_to_list: quantity, // <-- Передаємо кількість
            p_currency: sellCurrency,
            p_price_points: sellCurrency === 'points' ? Math.round(price) : null,
            p_price_atl: sellCurrency === 'atl_balance' ? price : null,
            p_price_ton: sellCurrency === 'ton_balance' ? price : null,
        };

        // Викликаємо нову функцію
        const { error } = await supabase.rpc('list_item_stack', params);

        toast.dismiss();
        if (error) {
            toast.error(`Помилка: ${error.message}`);
        } else {
            toast.success("Ваш лот виставлено на ринок!");
        }

        setItemToSell(null);
        setSellPrice('');
        setSellQuantity('1');
        await loadPageData();
        setIsProcessing(false);
    };
    
    // Новий обробник для зняття з продажу
    const handleDelist = (listing: MarketListing) => {
        setConfirmation({
            isOpen: true,
            message: (
                <>
                    Ви впевнені, що хочете зняти
                    <br />
                    <strong className={`rarity-font-${listing.items.rarity?.toLowerCase()}`}>{listing.items.name}</strong>
                    <br />
                    з продажу?
                </>
            ),
            onConfirm: async () => {
                setConfirmation(null); // Закриваємо вікно перед дією
                setIsProcessing(true);
                toast.loading("Знімаємо лот...");
                
                const { error } = await supabase.rpc('delist_market_item', { 
                    p_listing_id: listing.id, 
                    p_user_id: String(userId) 
                });

                toast.dismiss();
                if (error) {
                    toast.error(`Помилка: ${error.message}`);
                } else {
                    toast.success("Лот знято з продажу!");
                }
                
                await loadPageData();
                setIsProcessing(false);
            },
        });
    };

    // --- Рендеринг ---
    return (
        <Page>
            <div style={styles.pageContainer}>
                <List>
                    <TopBar points={balances.points} atl_balance={balances.atl_balance} ton_balance={balances.ton_balance} />
                    <div style={styles.contentWrapper}> 
                        <h2 style={styles.title}>Торговий Майданчик</h2>
                        
                        <div style={styles.viewSwitcher}>
                            <button style={{ ...styles.switcherButton, ...(view === 'buy' ? styles.activeButton : {}) }} onClick={() => setView('buy')}>Купити</button>
                            <button style={{ ...styles.switcherButton, ...(view === 'sell' ? styles.activeButton : {}) }} onClick={() => setView('sell')}>Продати</button>
                            <button style={{ ...styles.switcherButton, ...(view === 'my_listings' ? styles.activeButton : {}) }} onClick={() => setView('my_listings')}>Мої лоти</button>
                        </div>

                        {view === 'buy' && (
                            <div style={styles.filtersContainer}>
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.selectControl}>
                                    <option value="all">Всі типи</option>
                                    <option value="weapon">Зброя</option>
                                    <option value="armor">Броня</option>
                                    <option value="helmet">Шоломи</option>
                                    <option value="gloves">Рукавиці</option>
                                    <option value="boots">Черевики</option>
                                </select>
                                
                                <div style={styles.filterButtonGroup}>
                                    <button 
                                        style={{...styles.filterButton, ...(filterCurrency === 'all' ? styles.activeFilterButton : {})}} 
                                        onClick={() => setFilterCurrency('all')}
                                    >
                                        Всі
                                    </button>
                                    <button 
                                        style={{...styles.filterButton, ...(filterCurrency === 'ton_balance' ? styles.activeFilterButton : {})}} 
                                        onClick={() => setFilterCurrency('ton_balance')}
                                    >
                                        💎
                                    </button>
                                    <button 
                                        style={{...styles.filterButton, ...(filterCurrency === 'atl_balance' ? styles.activeFilterButton : {})}} 
                                        onClick={() => setFilterCurrency('atl_balance')}
                                    >
                                        <img src="/coin/atl_g.png" alt="ATL" width={16} height={16} />
                                    </button>
                                    <button 
                                        style={{...styles.filterButton, ...(filterCurrency === 'points' ? styles.activeFilterButton : {})}} 
                                        onClick={() => setFilterCurrency('points')}
                                    >
                                        <img src="/coin/atl_s.png" alt="Points" width={16} height={16} />
                                    </button>
                                </div>

                                <select 
                                    value={sortOption} 
                                    onChange={(e) => setSortOption(e.target.value as SortOption)} 
                                    style={styles.selectControl}
                                    disabled={sortOption.startsWith('price_') && filterCurrency === 'all'} // Блокуємо, якщо не обрано валюту
                                >
                                    <option value="newest">Спочатку нові</option>
                                    <option value="price_asc">Ціна: за зростанням</option>
                                    <option value="price_desc">Ціна: за спаданням</option>
                                </select>
                            </div>
                        )}
                        
                        <div style={styles.gridContainer}>
                            {loading && <Placeholder>Завантаження...</Placeholder>}
                            
                            {view === 'buy' && !loading && (
                                <div className="item-grid">
                                    {listings.length > 0 
                                        ? listings.map(listing => <MarketListingCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />)
                                        : <p className="grid-placeholder">На ринку порожньо.</p>
                                    }
                                </div>
                            )}

                            {view === 'sell' && !loading && (
                                <div className="item-grid">
                                    {userInventory.length > 0 
                                        ? userInventory.map(item => <InventoryItemSlot key={item.id} item={item} onClick={() => setItemToSell(item)} />)
                                        : <p className="grid-placeholder">У вас немає предметів для продажу.</p>
                                    }
                                </div>
                            )}

                            {view === 'my_listings' && !loading && ( <div className="item-grid"> {myListings.length > 0 ? myListings.map(listing => <MarketListingCard key={listing.id} listing={listing} onClick={() => handleDelist(listing)} isMyListing />) : <p className="grid-placeholder">У вас немає активних лотів.</p> } </div> )}
                        </div>
                    </div>
                    <BottomBar activeTab={"city"} setActiveTab={() => router.push('/home')} />
                </List>
            </div>

            {/* Модальні вікна залишаються без змін */}
            {selectedListing && ( <div style={styles.modalOverlay} onClick={() => !isProcessing && setSelectedListing(null)}> <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}> <h3 style={styles.modalTitle}>Придбати предмет</h3> <p style={styles.modalItemName} className={`rarity-font-${selectedListing.items.rarity?.toLowerCase()}`}>{selectedListing.items.name}</p> <p>Ціна: <strong>{getPriceDisplay(selectedListing).price} {getPriceDisplay(selectedListing).icon}</strong></p> <div style={{marginTop: '20px'}}> <button style={styles.modalButton} onClick={handlePurchase} disabled={isProcessing}>{isProcessing ? 'Купуємо...' : 'Купити'}</button> <button style={styles.modalButtonSecondary} onClick={() => setSelectedListing(null)} disabled={isProcessing}>Скасувати</button> </div> </div> </div> )}
            {itemToSell && (
                <div style={styles.modalOverlay} onClick={() => !isProcessing && setItemToSell(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Виставити на продаж</h3>
                        <p style={styles.modalItemName} className={`rarity-font-${itemToSell.rarity?.toLowerCase()}`}>{itemToSell.name}</p>
                        
                        {/* Поле для вибору кількості */}
                        {itemToSell.quantity > 1 && (
                            <div>
                                <label style={{ fontWeight: 'bold' }}>Кількість (доступно: {itemToSell.quantity})</label>
                                <input 
                                    type="number"
                                    value={sellQuantity}
                                    onChange={(e) => setSellQuantity(e.target.value)}
                                    min="1"
                                    max={itemToSell.quantity}
                                    style={styles.modalInput}
                                />
                            </div>
                        )}

                        <label style={{ fontWeight: 'bold', marginTop: '15px', display: 'block' }}>Ціна за 1 шт.</label>
                        <div style={styles.currencySelector}>
                            {(['points', 'atl_balance', 'ton_balance'] as Currency[]).map(c => (
                                <button key={c} onClick={() => setSellCurrency(c)} style={{...styles.currencyButton, ...(sellCurrency === c ? styles.activeCurrencyButton : {})}}>
                                    {/* --- ЗМІНА ТУТ --- */}
                                    {c === 'points' 
                                        ? <img src="/coin/atl_s.png" alt="Points" width={28} height={28} /> 
                                        : c === 'atl_balance' 
                                        ? <img src="/coin/atl_g.png" alt="ATL" width={28} height={28} /> 
                                        : '💎'
                                    }
                                </button>
                            ))}
                        </div>
                        
                        <input type="number" placeholder="Ваша ціна" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} style={styles.modalInput} />
                        
                        <button style={styles.modalButton} onClick={handleListItem} disabled={isProcessing}>{isProcessing ? 'Виставляємо...' : 'На ринок'}</button>
                        <button style={styles.modalButtonSecondary} onClick={() => setItemToSell(null)} disabled={isProcessing}>Скасувати</button>
                    </div>
                </div>
            )}
            {confirmation && (
                <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title="Підтвердження"
                >
                    {confirmation.message}
                </ConfirmationModal>
            )}
            <Toaster position="top-center" reverseOrder={false} />
        </Page>
    );
};

const MarketListingCard = ({ listing, onClick, isMyListing = false }: { listing: MarketListing; onClick: () => void; isMyListing?: boolean }) => {
    if (!listing.items) return null; 
    const { price, icon } = getPriceDisplay(listing);
    const itemForSlot: MergedInventoryItem = {
        id: listing.items.id, item_id: listing.items.id, name: listing.items.name, image_url: listing.items.image_url ?? '',
        rarity: listing.items.rarity, item_key: listing.items.item_key ?? '', item_type: listing.items.item_type,
        sub_type: listing.items.sub_type ?? '', stats: listing.items.stats ?? {}, equipped: false, quantity: 1, upgrade_level: 0, is_listed: true,
    };
    
    return (
        <div onClick={onClick} style={{cursor: 'pointer'}}>
            <InventoryItemSlot item={itemForSlot} price={price} priceCurrencyIcon={icon} onClick={onClick} />
             {isMyListing && <div style={{textAlign: 'center', color: '#ffbaba', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '5px' }}>Натисніть, щоб зняти</div>}
        </div>
    );
}