import { createClient } from '@supabase/supabase-js';

// Отримуємо URL та анонімний ключ з змінних середовища
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Перевірка на відсутність ключів
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials are missing in the environment variables.');
}

// Створюємо клієнт Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Експортуємо клієнт для використання в інших частинах проєкту
export default supabase;
