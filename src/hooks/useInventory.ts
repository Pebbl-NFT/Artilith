import { supabase } from "@/lib/supabaseClient";

// FIX: Додаємо 'sub_type' до інтерфейсу предмета в інвентарі
export interface MergedInventoryItem {
  id: number; 
  equipped: boolean;
  upgrade_level: number;
  quantity: number;
  item_id: number;
  name: string;
  item_type: string;
  sub_type: string | null; // <-- ОСНОВНА ЗМІНА 1
  rarity: string;
  stats: any; 
  image_url: string | null;
}

// FIX: Додаємо 'sub_type' до типу для внутрішнього запиту
type InventoryRow = {
  id: number;
  equipped: boolean;
  upgrade_level: number;
  quantity: number;
  items: {
    id: number;
    name: string;
    item_type: string;
    sub_type: string | null; // <-- ОСНОВНА ЗМІНА 2
    rarity: string;
    stats: any;
    image_url: string | null;
  } | null;
};

export const fetchInventory = async (userId: string): Promise<MergedInventoryItem[]> => {
  if (!userId) return [];

  // FIX: Додаємо 'sub_type' до select-запиту
  const { data, error } = await supabase
    .from("inventory")
    .select<string, InventoryRow>(`
      id, equipped, upgrade_level, quantity,
      items ( id, name, item_type, sub_type, rarity, stats, image_url ) 
    `) // <-- ОСНОВНА ЗМІНА 3
    .eq("user_id", String(userId));

  if (error) {
    console.error("Помилка при завантаженні інвентаря:", error.message);
    return [];
  }
  
  return data
    .filter((entry): entry is InventoryRow & { items: NonNullable<InventoryRow['items']> } => entry.items !== null)
    .map((entry) => ({
      id: entry.id,
      equipped: entry.equipped,
      upgrade_level: entry.upgrade_level,
      quantity: entry.quantity,
      item_id: entry.items.id,
      name: entry.items.name,
      item_type: entry.items.item_type,
      sub_type: entry.items.sub_type, // <-- ОСНОВНА ЗМІНА 4
      rarity: entry.items.rarity,
      stats: entry.items.stats,
      image_url: entry.items.image_url,
    }));
};