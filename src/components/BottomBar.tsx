'use client';

import { Button,  Placeholder } from '@telegram-apps/telegram-ui';
import cube from '../app/_assets/cube.svg';
import banknotes from '../app/_assets/banknotes.svg';

export default function BottomBar() {
  return (
    <div className='bottom-bar' style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'fixed', bottom: -10, background: 'var(--tgui--secondary_bg_color)', padding: 10 }}>
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
        <img
          alt="icon"
          src={banknotes.src}
          style={{
            flex: '1',
            width: '30%',  
            margin: '0 auto',
            display: 'block',
            marginBlockStart: '10px',
            marginBlockEnd: '-30px',
            borderRadius: '100%',
            border: '1px solid #007AFF',
            blockSize: 'fit-content',
            padding: '5px', 
            cursor: 'pointer',
            backgroundColor: '#007AFF'
          }}
        />
        <Placeholder>???</Placeholder>
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
        <img
          alt="icon"
          src={cube.src}
          style={{
            flex: '1',
            width: '30%',  
            margin: '0 auto',
            display: 'block',
            marginBlockStart: '10px',
            marginBlockEnd: '-30px',
            borderRadius: '100%',
            border: '1px solid #007AFF',
            blockSize: 'fit-content',
            padding: '5px', 
            cursor: 'pointer',
            backgroundColor: '#007AFF'
          }}
        />
        <Placeholder>Home</Placeholder>
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
        <img
          alt="icon"
          src={banknotes.src}
          style={{
            flex: '1',
            width: '30%',  
            margin: '0 auto',
            display: 'block',
            marginBlockStart: '10px',
            marginBlockEnd: '-30px',
            borderRadius: '100%',
            border: '1px solid #007AFF',
            blockSize: 'fit-content',
            padding: '5px', 
            cursor: 'pointer',
            backgroundColor: '#007AFF'
          }}
        />
        <Placeholder>???</Placeholder>
      </Button>
    </div>
  );
}