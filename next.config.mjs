import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

export default withNextIntl({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fohyijwxgtmrimknyfic.supabase.co', 
        port: '',
        // -- ОСЬ ЦЕЙ РЯДОК ПОТРІБНО ЗМІНИТИ --
        // Було: '/storage/v1/object/public/**'
        // Стало:
        pathname: '/storage/v1/object/public/image-templates/**',
      },
    ],
  },
});