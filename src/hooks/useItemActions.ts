// src/hooks/useItemActions.ts
import { supabase } from "@/lib/supabaseClient";

/**
 * Додає предмет до інвентаря гравця, викликаючи єдину серверну функцію.
 */
export async function addInventoryItem(userId: string, itemId: number): Promise<boolean> {
    if (!userId || !itemId) {
        console.error("User ID or Item ID is missing");
        return false;
    }

    const { error } = await supabase.rpc('add_item_to_inventory', {
        p_user_id: userId,
        p_item_id: itemId
    });

    if (error) {
        console.error("Error calling add_item_to_inventory:", error);
        return false;
    }

    return true;
}