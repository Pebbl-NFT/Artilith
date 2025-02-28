'use client';

import { Button, Image } from '@telegram-apps/telegram-ui';
import tonSvg from '../app/_assets/ton.svg';

export default function BottomBar() {
  return (
    <div className='bottom-bar' style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'fixed', bottom: 0, background: 'var(--tgui--secondary_bg_color)', padding: 10 }}>
      <Button
        Component="a"
        href=" "
        mode="filled"
        size="s"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          padding: 10,
          width: '30%',
          margin: 20,
          borderRadius: 50,
          border: '1px solid rgb(0, 123, 255)',
        }}
      >
        Hi user
      </Button>
      <Button
        href="/ton-connect"
        Component="b"
        mode="filled"
        size="s"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          padding: 10,
          width: '30%',
          margin: 20,
          borderRadius: 50,
          border: '1px solid rgb(0, 123, 255)',
        }}
        before={
          <Image
            src={tonSvg.src}
            style={{ 
              backgroundColor: '#007AFF',
            }}
            size={20}
          />
        }
      >
        Connect wallet
      </Button>
    </div>
  );
}