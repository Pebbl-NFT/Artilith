import { supabase } from "@/lib/supabaseClient";

export const reduceEnergyRPC = async (userId: string, amount: number = 1): Promise<boolean> => {
    const { data, error } = await supabase.rpc('reduce_user_energy', {
        user_id_param: userId,
        amount_param: amount
    });

    if (error) {
        console.error("Помилка при виклику RPC reduce_user_energy:", error.message);
        return false;
    }
    return data;
};