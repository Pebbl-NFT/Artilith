'use client';

import { Button, Image } from '@telegram-apps/telegram-ui';

export default function BottomBar() {
  return (
    <div className='bottom-bar' style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'fixed', bottom: 0, background: 'var(--tgui--secondary_bg_color)', padding: 10 }}>
      <Button
        Component="a"
        mode="filled"
        size="l"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          borderTop: '1px solid rgb(0, 123, 255)',
          width: '25%',
          borderRadius: 10,
          display: 'flex',
          margin: 5,
          marginLeft: -5
        }}
      >
        1
      </Button>
      <Button
        Component="a"
        mode="filled"
        size="l"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          borderTop: '1px solid rgb(0, 123, 255)',
          width: '25%',
          borderRadius: 10,
          display: 'flex',
          margin: 5,

        }}
      >
        2
      </Button>
      <Button
        Component="a"
        mode="filled"
        size="l"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          borderTop: '1px solid rgb(0, 123, 255)',
          width: '25%',
          borderRadius: 10,
          display: 'flex',
          margin: 5,

        }}
      >
        3
      </Button>
      <Button
        Component="a"
        mode="filled"
        size="l"
        target="_blank"
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          borderTop: '1px solid rgb(0, 123, 255)',
          width: '25%',
          borderRadius: 10,
          display: 'flex',
          margin: 5,
          marginRight: 15

        }}
      >
        4
      </Button>
    </div>
  );
}