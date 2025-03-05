import { supabase } from "./supabaseClient";

export const logActivity = async (userId: number, action: string, blockId?: string) => {
  const { data, error } = await supabase
    .from("activity")
    .insert([{ user_id: userId, action, block_id: blockId || null }]);

  if (error) {
    console.error("Помилка запису активності:", error.message);
  } else {
    console.log("Активність збережена:", data);
  }
};
