'use client';

import { useEffect } from 'react';
import { useSignal, initData, type User } from '@telegram-apps/sdk-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InitDataPage() {
  const initDataState = useSignal(initData.state);
  const router = useRouter();

  useEffect(() => {
    const saveUserToSupabase = async () => {
      if (!initDataState?.user) return;

      const { id, username, firstName, lastName, photoUrl } = initDataState.user;

      const { data, error } = await supabase
        .from('users')
        .upsert(
          [
            {
              id,
              username,
              first_name: firstName,
              last_name: lastName,
              photo_url: photoUrl,
            },
          ],
          { onConflict: 'id' }
 // Якщо ID вже є, оновлюємо дані
        );

      if (error) {
        console.error('Помилка збереження користувача в Supabase:', error);
      } else {
        console.log('Користувач збережений:', data);
        router.push('/home'); // Перенаправляємо на головну сторінку після збереження
      }
    };

    saveUserToSupabase();
  }, [initDataState, router]);

  return <div>Завантаження...</div>;
}
