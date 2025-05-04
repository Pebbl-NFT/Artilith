import { supabase } from "@/lib/supabaseClient";

export const updateUserPoints = async (userId: string, newPoints: number): Promise<boolean> => {
  const { error } = await supabase
    .from("users")
    .update({ points: newPoints })
    .eq("id", userId);

  if (error) {
    console.error("Помилка оновлення балів:", error);
    return false;
  }

  return true;
};