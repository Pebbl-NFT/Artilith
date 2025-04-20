import { Button } from '@telegram-apps/telegram-ui';
import tonSvg from '../app/_assets/ton.svg';
import { useMemo, useEffect } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';
import Link from 'next/link';

export default function TopBar({ points }: { points: number }) {
  const initDataState = useSignal(initData.state);
  const username = useMemo(() => {
    return initDataState?.user?.firstName || 'User';
  }, [initDataState]);

  useEffect(() => {
    if (initDataState?.user) {
      const user = initDataState.user;
      console.log('User data before saving:', user);
    }
  }, [initDataState?.user]);

  return (
    <div className='top-bar' style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ position: 'relative', margin: 20 }}>
        <Link href="/home/profile">
          <Button
            mode="filled"
            size="s"
            style={{
              background: 'var(--tgui--secondary_bg_color)',
              padding: 10,
              borderRadius: 50,
              width: '110px',
              border: '1px solid rgb(255, 255, 255)',
            }}
            name="greeting"
          >
            👋 {username}
          </Button>
        </Link>

        {/* індикатор */}
        <span
          style={{
            position: 'absolute',
            top: -1,
            right: 2,
            width: 8,
            height: 8,
            backgroundColor: '#ff3b30',
            borderRadius: '50%',
            border: '1px solid white',
          }}
        />
      </div>

      <Button
        mode="filled"
        size="s"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          padding: 10,
          margin: 20,
          borderRadius: 50,
          border: '0px solid rgb(255, 255, 255)',
        }}
        name="score-button"
      >
        {points} 🪨
      </Button>
    </div>
  );
}
