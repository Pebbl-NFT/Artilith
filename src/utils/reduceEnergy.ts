// src/utils/reduceEnergy.ts
import { supabase } from "@/lib/supabaseClient";

export const reduceEnergyRPC = async (userId: string | number, amount: number): Promise<boolean> => {
    const { data, error } = await supabase.rpc('reduce_energy', {
        p_user_id: String(userId),
        p_amount: amount
    });

    if (error) {
        console.error("Error in reduceEnergyRPC:", error);
        return false;
    }

    return data;
};