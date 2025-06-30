'use client';
import { type PropsWithChildren, useEffect } from 'react';
import {
    initData,
    miniApp,
    useLaunchParams,
    useSignal,
} from '@telegram-apps/sdk-react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorPage } from '@/components/ErrorPage';
import { useTelegramMock } from '@/hooks/useTelegramMock';
import { useDidMount } from '@/hooks/useDidMount';
import { useClientOnce } from '@/hooks/useClientOnce';
import { setLocale } from '@/core/i18n/locale';
import { init } from '@/core/init';

// <-- НАШІ ЗМІНИ (1/3): Додаємо імпорти
import { EnergyProvider } from '@/providers/EnergyProvider';
import { supabase } from "@/lib/supabaseClient";

import './styles.css';

function RootInner({ children }: PropsWithChildren) {
    const isDev = process.env.NODE_ENV === 'development';
    console.log('isDev:', isDev);

    if (isDev) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useTelegramMock();
    }

    const lp = useLaunchParams();
    console.log('lp:', lp);
    const debug = isDev || lp.startParam === 'debug';
    console.log('debug:', debug);

    useClientOnce(() => {
        init(debug);
    });

    const isDark = useSignal(miniApp.isDark);
    console.log('isDark:', isDark);

    const initDataUser = useSignal(initData.user);
    console.log('initDataUser:', initDataUser);

    // <-- НАШІ ЗМІНИ (2/3): Отримуємо userId (у вас це вже було, і це правильно)
    const userId = initDataUser?.id;

    useEffect(() => {
        if (initDataUser) {
            setLocale(initDataUser.languageCode);
        }
    }, [initDataUser]);

    return (
        <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
            <AppRoot
                appearance={isDark ? 'dark' : 'light'}
                platform={['macos', 'ios'].includes(lp.platform) ? 'ios' : 'base'}
            >
                {/* <-- НАШІ ЗМІНИ (3/3): Огортаємо children в EnergyProvider */}
                <EnergyProvider userId={userId} supabase={supabase}>
                    {children}
                </EnergyProvider>
            </AppRoot>
        </TonConnectUIProvider>
    );
}

export function Root(props: PropsWithChildren) {
    const didMount = useDidMount();
    console.log('didMount:', didMount);

    return didMount ? (
        <ErrorBoundary fallback={ErrorPage}>
            <RootInner {...props} />
        </ErrorBoundary>
    ) : (
        <div className="root__loading">Loading</div>
    );
}