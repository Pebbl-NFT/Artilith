import { supabase } from "@/lib/supabaseClient";
import { AllItems } from "@/components/Item/Items";

export const fetchInventory = async (userId: string) => {
  const { data, error } = await supabase
    .from("inventory")
    .select("id, item_id, equipped")
    .eq("user_id", userId);

  if (error) {
    console.error("Помилка при завантаженні інвентаря:", error.message);
    return [];
  }

  return data.map((entry) => {
    const item = AllItems.find((i) => i.item_id === entry.item_id);
    return {
      ...item,
      id: entry.id,
      equipped: entry.equipped ?? false,
    };
  });
};