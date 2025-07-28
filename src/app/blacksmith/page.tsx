"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { List, Placeholder } from '@telegram-apps/telegram-ui';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// --- КОМПОНЕНТИ ---
import { Page } from "@/components/Page";
import TopBar from "@/components/TopBar";
import BottomBar from "@/components/BottomBar";
import InventoryItemSlot from '@/components/Item/InventoryItemSlot';
import { ItemCard } from "@/components/ItemCard";

// --- ДАНІ ТА ЛОГІКА ---
import { supabase } from "@/lib/supabaseClient";
import { MergedInventoryItem, fetchInventory } from "@/hooks/useInventory";

// --- СТИЛІ ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { minHeight: '100vh', backgroundImage: `url('/bg/blacksmith_bg.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e0e7ff', fontFamily: "'Spectral', serif", },
  contentWrapper: { padding: '70px 15px 100px 15px', },
  title: { fontFamily: "'Cinzel', serif", textAlign: 'center', fontSize: 'clamp(1.8rem, 6vw, 2.2rem)', marginBottom: '20px', color: '#fefce8', textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)', },
  contractArea: { background: 'rgba(10, 5, 20, 0.7)', backdropFilter: 'blur(5px)', border: '1px solid rgba(129, 140, 248, 0.2)', borderRadius: '12px', padding: '15px', marginBottom: '20px', },
  slotsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '15px', },
  createButton: { width: '100%', padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: '#fefce8', background: 'linear-gradient(145deg, #5b4d9a, #8273d4)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)', },
  createButtonDisabled: { background: '#4a4a5a', color: '#888', cursor: 'not-allowed', boxShadow: 'none', },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '15px', marginTop: '20px' },
  sectionTitle: { color: '#a7b3d9', textAlign: 'center' as const, marginBottom: '15px', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', },
};

// --- КОМПОНЕНТ СЛОТА ---
const ContractSlot = ({ item, onClick }: { item: MergedInventoryItem | null, onClick: () => void }) => {
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        paddingTop: '100%',
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px dashed rgba(129, 140, 248, 0.4)',
        borderRadius: '8px',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      {item && (
        <div style={{
          position: 'absolute',
          width: '90%',
          height: '90%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <InventoryItemSlot item={item} onClick={() => {}} hideName={true} />
        </div>
      )}
    </div>
  );
};

// --- ОСНОВНИЙ КОМПОНЕНТ СТОРІНКИ ---
export default function BlacksmithPage() {
  const router = useRouter();
  const initDataState = useSignal(initData.state);
  const userId = initDataState?.user?.id;

  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({ points: 0, atl_balance: 0, ton_balance: 0 });
  const [fullInventory, setFullInventory] = useState<MergedInventoryItem[]>([]);
  
  // Зберігаємо лише один вибраний стак для контракту
  const [contractStack, setContractStack] = useState<MergedInventoryItem | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [newItem, setNewItem] = useState<MergedInventoryItem | null>(null);

  const loadBlacksmithData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [userDataRes, inventoryDataRes] = await Promise.all([
      supabase.from("users").select("points, atl_balance, ton_balance").eq("id", String(userId)).single(),
      fetchInventory(String(userId))
    ]);
    if (userDataRes.data) setBalances(userDataRes.data);
    setFullInventory(inventoryDataRes);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadBlacksmithData(); }, [loadBlacksmithData]);

  // Інвентар для відображення ховає вибраний стак
  const displayedInventory = useMemo(() => {
    if (!contractStack) return fullInventory;
    return fullInventory.filter(item => item.id !== contractStack.id);
  }, [fullInventory, contractStack]);

  // Логіка вибору стака для контракту
  const handleSetContractStack = (itemToUse: MergedInventoryItem) => {
    if (itemToUse.quantity < 10) {
      toast.error(`Потрібно щонайменше 10 одиниць. У вас є ${itemToUse.quantity}.`);
      return;
    }
    setContractStack(itemToUse);
  };

  // Очищення слотів контракту
  const handleClearContract = () => {
    setContractStack(null);
  };
  
  // Логіка створення контракту
  const handleCreateContract = async () => {
      if (isProcessing || !userId || !contractStack) return;
      
      setIsProcessing(true);
      toast.loading("Магія коваля в дії...");

      // Викликаємо нову функцію, передаючи ID стопки
      const { data, error } = await supabase.rpc('execute_trade_up_from_stack', {
          p_user_id: userId,
          p_inventory_id: contractStack.id
      });

      toast.dismiss();
      if (error) {
          toast.error(`Помилка: ${error.message}`);
          setIsProcessing(false);
          return;
      }

      const createdItemData = data?.[0];

      if (createdItemData) {
          toast.success(`Створено новий предмет: ${createdItemData.name}!`);
          const createdItemForCard: MergedInventoryItem = { 
              ...createdItemData, id: 0, equipped: false, upgrade_level: 0, 
              quantity: 1, item_id: createdItemData.id, item_key: '', is_listed: false 
          };
          setNewItem(createdItemForCard);
          
          setContractStack(null);
          await loadBlacksmithData();
      } else {
          toast.error("Не вдалося отримати дані про новий предмет.");
      }
      
      setIsProcessing(false);
  }

  const isButtonDisabled = !contractStack || isProcessing;

  return (
    <Page>
      <div style={styles.pageContainer}>
        <List>
          <TopBar points={balances.points} atl_balance={balances.atl_balance} ton_balance={balances.ton_balance} />
          <div style={styles.contentWrapper}> 
            <h2 style={styles.title}>Ковальня</h2>
            {loading ? <Placeholder>Завантаження інвентаря...</Placeholder> : (
              <>
                <div style={styles.contractArea}>
                  <div style={styles.slotsGrid}>
                    {/* Візуально заповнюємо 10 слотів, якщо вибрано стак */}
                    {Array(10).fill(null).map((_, index) => (
                      <ContractSlot 
                        key={index} 
                        // Показуємо один і той самий предмет у всіх слотах
                        item={contractStack} 
                        onClick={handleClearContract} 
                      />
                    ))}
                  </div>
                  <button 
                    style={{...styles.createButton, ...(isButtonDisabled ? styles.createButtonDisabled : {})}}
                    onClick={handleCreateContract}
                    disabled={isButtonDisabled}
                  >
                    {isProcessing ? 'Створення...' : 'Створити з 10 одиниць'}
                  </button>
                </div>

                <div>
                  <h3 style={styles.sectionTitle}>Ваш інвентар</h3>
                  <div style={styles.inventoryGrid}>
                    {displayedInventory.length > 0 ? displayedInventory.map(item => (
                      <div key={item.id} onClick={() => handleSetContractStack(item)}>
                        <InventoryItemSlot item={item} onClick={() => {}} />
                      </div>
                    )) : <Placeholder>Інвентар порожній.</Placeholder>}
                  </div>
                </div>
              </>
            )}
          </div>
          <BottomBar activeTab={"city"} setActiveTab={() => router.push('/home')} />
        </List>
      </div>

      {/* Модальне вікно для показу результату */}
      {newItem && (
          <div style={styles.modalOverlay} onClick={() => setNewItem(null)}>
              <div onClick={(e) => e.stopPropagation()}>
                  <ItemCard
                      item={newItem}
                      mode="inventory"
                      onClose={() => setNewItem(null)}
                      onEquipRequest={() => {}}
                      onUnequipRequest={() => {}}
                      onSellRequest={() => {}}
                      onCancelSellRequest={() => {}}
                  />
              </div>
          </div>
      )}

      <Toaster position="top-center" reverseOrder={false} />
    </Page>
  );
};
