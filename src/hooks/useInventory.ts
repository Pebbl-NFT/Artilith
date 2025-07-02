import { supabase } from "@/lib/supabaseClient";


export interface MergedInventoryItem {
  id: number;
  equipped: boolean;
  upgrade_level: number;
  quantity: number;
  item_id: number;
  name: string;
  item_type: string;
  sub_type: string | null;
  rarity: string;
  stats: any;
  image_url: string | null;
  item_key: string | null;
  is_listed: boolean;
}


type InventoryRow = {
  id: number;
  equipped: boolean;
  upgrade_level: number;
  quantity: number;
  is_listed: boolean;
  items: {
    id: number;
    name: string;
    item_type: string;
    sub_type: string | null; 
    rarity: string;
    stats: any;
    image_url: string | null;
  } | null;
};

export const fetchInventory = async (userId: string): Promise<MergedInventoryItem[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("inventory")
    .select<string, any>(`
      id, equipped, upgrade_level, quantity, is_listed,
      items ( id, name, item_type, sub_type, rarity, stats, image_url ) 
    `) 
    .eq("user_id", String(userId));

  if (error) {
    console.error("Помилка при завантаженні інвентаря:", error.message);
    return [];
  }
  
  return data
    .filter((entry) => entry.items !== null)
    .map((entry) => ({
      id: entry.id,
      equipped: entry.equipped,
      upgrade_level: entry.upgrade_level,
      quantity: entry.quantity,
      item_id: entry.items.id,
      name: entry.items.name,
      item_type: entry.items.item_type,
      sub_type: entry.items.sub_type,
      rarity: entry.items.rarity,
      stats: entry.items.stats,
      image_url: entry.items.image_url,
      item_key: null, 
      is_listed: entry.is_listed,
    }));
};