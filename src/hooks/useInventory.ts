import { supabase } from "@/lib/supabaseClient";

// FIX: Оновлюємо інтерфейс, видаляючи неіснуючі поля description та price
export interface MergedInventoryItem {
  id: number; 
  equipped: boolean;
  upgrade_level: number;
  quantity: number;
  item_id: number;
  name: string;
  item_type: string;
  rarity: string;
  stats: any; 
  image_url: string | null;
}

// FIX: Оновлюємо тип для запиту, видаляючи неіснуючі поля
type InventoryRow = {
  id: number;
  equipped: boolean;
  upgrade_level: number;
  quantity: number;
  items: {
    id: number;
    name: string;
    item_type: string;
    rarity: string;
    stats: any;
    image_url: string | null;
  } | null;
};

export const fetchInventory = async (userId: string): Promise<MergedInventoryItem[]> => {
  if (!userId) return [];

  // FIX: Видаляємо description та price з select-запиту
  const { data, error } = await supabase
    .from("inventory")
    .select<string, InventoryRow>(`
      id, equipped, upgrade_level, quantity,
      items ( id, name, item_type, rarity, stats, image_url )
    `)
    .eq("user_id", String(userId));

  if (error) {
    console.error("Помилка при завантаженні інвентаря:", error.message);
    return [];
  }

  // FIX: Оновлюємо мапінг, щоб він відповідав новій структурі
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
      rarity: entry.items.rarity,
      stats: entry.items.stats,
      image_url: entry.items.image_url,
    }));
};
