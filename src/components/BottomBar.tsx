'use client';

import { Button,  Placeholder } from '@telegram-apps/telegram-ui';
import home from '../app/_assets/home.svg';
import Auction from '../app/_assets/ticket.svg';
import lockclosed from '../app/_assets/lock-closed.svg';

export default function BottomBar() {
  return (
    <div
      className="bottom-bar"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        position: 'fixed',
        bottom: 0,
        background: 'var(--tgui--secondary_bg_color)',
        borderTop: '1px solid rgb(0, 123, 255)',
        zIndex: 50,
      }}
    >
    {[ 
      { icon: Auction.src, label: 'AUCTION', bold: false },
      { icon: home.src, label: 'HOLD', bold: false, Link: "/home" },
      { icon: lockclosed.src, label: 'SOON', bold: true }
    ].map((item, index) => (
      <Button
        key={index}
        Component="a"
        mode="filled"
        size="l"
        target="_blank"
        style={{
          flex: 1,
          height: 90,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            alt="icon"
            src={item.icon}
            style={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              borderRadius: '100%',
              border: '1px solid #007AFF',
              backgroundColor: '#007AFF',
              padding: 6,
              boxSizing: 'border-box',
            }}
          />
          <Placeholder
            style={{
              fontSize: 14,
              fontWeight: item.bold ? 'bold' : 'lighter',
              color: item.bold ? 'rgb(143, 143, 143)' : undefined,
              marginTop: 0,
              textAlign: 'center',
            }}
          >
            {item.label}
          </Placeholder>
        </div>
      </Button>
      ))}
    </div>
  );
}