import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, // Замість цього використовуйте свою URL для Supabase
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Ваш ключ для анонімного доступу
);

export default supabase;
