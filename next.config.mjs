import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

// Ми додаємо новий ключ 'images' до об'єкта з налаштуваннями
export default withNextIntl({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // -- ОСЬ ВАШ НОВИЙ БЛОК --
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // ВАЖЛИВО: Замініть на ваш hostname з помилки!
        hostname: 'fdhyjbwqterimkmyfic.supabase.co', 
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Ваші інші налаштування можуть бути тут
});