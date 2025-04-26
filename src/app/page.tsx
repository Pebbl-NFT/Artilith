'use client';

import { useEffect } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Placeholder } from "@telegram-apps/telegram-ui";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TelegramUser = {
  id: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
};

export default function InitDataPage() {
  const initDataState = useSignal(initData.state);
  const router = useRouter();

  useEffect(() => {
    if (!initDataState?.user) return;

    const user = initDataState.user as TelegramUser;

    const saveUserToSupabase = async () => {
      try {
        const { id, username, firstName, lastName, photoUrl } = user;

        const { error } = await supabase
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
          );

        if (error) throw error;

        console.log('Користувач збережений успішно');
        router.replace('/home');
      } catch (error) {
        console.error('Помилка збереження користувача в Supabase:', error);
      }
    };

    saveUserToSupabase();
  }, [router]);

  return (
    <Placeholder> 
      <div className="fixed top-50% left-0 z-50 w-screen h-screen flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white border border-gray-300 py-4 px-6 rounded-lg flex flex-col items-center">
          <div className="flex space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></span>
          </div>
          <div className="text-gray-600 text-sm font-medium mt-3 text-center">
            Завантаження...
          </div>
        </div>
      </div>
  </Placeholder>
  );
}
