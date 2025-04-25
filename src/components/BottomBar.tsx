'use client';

import { useState } from 'react';
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import home from '../app/_assets/home.svg';
import Auction from '../app/_assets/ticket.svg';
import lockclosed from '../app/_assets/lock-closed.svg';

const tabItems = [
  { icon: Auction.src, label: 'SHOP', bold: false, value: 'shop' },
  { icon: home.src, label: 'HOLD', bold: false, value: 'home' },
  { icon: lockclosed.src, label: 'ITEM', bold: true, value: 'soon' },
];

export default function BottomBar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (value: string) => void }) {
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
      {tabItems.map((item) => (
        <Button
          key={item.value}
          mode="filled"
          size="l"
          onClick={() => setActiveTab(item.value)}
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
                backgroundColor: activeTab === item.value ? 'rgb(0, 123, 255)' : 'gray',
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
