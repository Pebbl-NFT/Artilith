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
    <div className='top-bar' 
    style={{ 
      display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: 50,
        background: 'var(--tgui--secondary_bg_color)',
        backdropFilter: "blur(2px)",
        transition: "filter 0.3s ease",
        pointerEvents: "auto",
        top: 0,
        position: 'fixed',
        zIndex: 10,
    }}>
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
        💎 0 
      </Button>
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
        🪙 0 
      </Button>
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
        🪨 {points} 
      </Button>
    </div>
  );
}
