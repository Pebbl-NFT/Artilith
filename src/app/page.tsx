'use client';

import { useEffect } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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
    <div className="fixed top-0 left-0 z-50 w-screen h-screen flex items-center justify-center background: rgba(0, 0, 0, 0.3);">
      <div className="bg-white border py-2 px-5 rounded-lg flex items-center flex-col">
        <div className="loader-dots block relative w-20 h-5 mt-2">
          <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
          <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
          <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
          <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-gray-500 text-xs font-light mt-2 text-center">
          Please wait...
        </div>
      </div>
    </div>
  );
}
