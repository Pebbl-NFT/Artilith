'use client';

import { Button, Image } from '@telegram-apps/telegram-ui';
import tonSvg from '../app/_assets/ton.svg';
import { useMemo } from 'react';
import { useSignal, initData } from '@telegram-apps/sdk-react';

export default function TopBar() {
  const initDataState = useSignal(initData.state);

  const username = useMemo(() => {
    return initDataState?.user?.firstName || 'User';
  }, [initDataState]);

  return (
    <div className='top-bar' style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <p
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: 8,
          color: 'var(--tgui--secondary_text_color)',
          width: '52%',
        }}> 0.11.6 </p>
      <Button
        href=" "
        mode="filled"
        size="s"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          padding: 10,
          margin: 20,
          borderRadius: 50,
          textOverflow: 'ellipsis',
        }}
      >
        👋 {username}
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
          border: '0px solid rgb(0, 123, 255)',
        }}
        after={
          <Image
            src={tonSvg.src}
            style={{ 
              backgroundColor: '#007AFF',
            }}
            size={20}
          />
        }
      >
        Connect
      </Button>
    </div>
  );
}