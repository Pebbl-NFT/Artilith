// src/utils/reduceEnergy.ts
import { supabase } from "@/lib/supabaseClient";

export const reduceEnergy = async (userId: string | number, amount: number = 1) => {
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("energy")
      .eq("id", userId)
      .single();

  if (fetchError || !user) {
    console.error("Помилка при отриманні енергії:", fetchError?.message);
    return false;
  }

  const newEnergy = Math.max(user.energy - amount, 0);

  const { error: updateError } = await supabase
    .from("users")
    .update({ energy: newEnergy })
    .eq("id", userId);

  if (updateError) {
    console.error("Помилка при збереженні нової енергії:", updateError.message);
    return false;
  }

  return true;
};
