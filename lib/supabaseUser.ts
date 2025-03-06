import { createClient } from '@supabase/supabase-js';

// Ініціалізація клієнта Supabase за допомогою змінних середовища
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const saveUserToDB = async (user: any) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          id: user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          username: user.username, // Використовуємо username
          photo_url: user.photo_url, // Використовуємо photo_url замість email
        }
      ]);
    if (error) {
      console.error('Error saving user to DB:', error.message);
    } else {
      console.log('User data saved to DB:', data); // Перевірте, чи повертаються правильні дані
    }
  } catch (error) {
    console.error('Error in saveUserToDB:', error);
  }
};