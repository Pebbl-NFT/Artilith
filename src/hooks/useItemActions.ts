import { supabase } from "@/lib/supabaseClient";

export const addInventoryItem = async (userId: string, itemId: number, itemName: string) => {
  const { error } = await supabase
    .from("inventory")
    .insert([{ user_id: userId, item_id: itemId, item: itemName }]);

  return !error;
};

export const toggleEquipItem = async (userId: string, inventory: any[], selectedItemId: number, selectedType: string) => {
  const itemsToUnequip = inventory.filter(i => i.type === selectedType && i.equipped);
  const idsToUnequip = itemsToUnequip.map(i => i.id);

  if (idsToUnequip.length > 0) {
    await supabase.from("inventory").update({ equipped: false })
      .eq("user_id", userId)
      .in("id", idsToUnequip);
  }

  await supabase.from("inventory")
    .update({ equipped: true })
    .eq("user_id", userId)
    .eq("id", selectedItemId);
};
