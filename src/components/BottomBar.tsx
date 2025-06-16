'use client';

import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import Artilith from '../app/_assets/Artilith_logo-no-bg.png';
import City from '../app/_assets/citytab.png';
import Adv from '../app/_assets/advtab.png';

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
        backgroundColor: "#121015",
        borderTop: '1px solid rgb(255, 255, 255)',
        zIndex: 150,
      }}>
      {/* Місто */}
      <Button
        mode="filled"
        size="l"
        onClick={() => setActiveTab('city')}
        style={{
          flex: 1,
          height: 70,
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
            alt="Дім"
            src={City.src}
            style={{
              width: 60,
              height: 60,
              objectFit: 'contain',
              borderRadius: '100%',
              padding: 1,
              boxSizing: 'border-box',
              marginBottom: -5,
              marginTop: 0,
            }}
          />
          <Placeholder
            style={{
              fontSize: 12,
              fontWeight: 'lighter',
              color: activeTab === 'city' ? 'rgb(255, 255, 255)' : 'gray',
              marginTop: -30,
              textAlign: 'center',
            }}
          >
            МІСТО
          </Placeholder>
        </div>
      </Button>

      {/* Дім */}
      <Button
        mode="filled"
        size="l"
        onClick={() => setActiveTab('home')}
        style={{
          flex: 1,
          height: 70,
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
            alt="Дім"
            src={Artilith.src}
            style={{
              width: 60,
              height: 60,
              objectFit: 'contain',
              borderRadius: '100%',
              backgroundColor: activeTab === 'home' ? 'rgb(255, 255, 255)' : 'gray',
              padding: 1,
              boxSizing: 'border-box',
              marginBottom: 40,
            }}
          />
        </div>
      </Button>

      {/* Пригоди */}
      <Button
        mode="filled"
        size="l"
        onClick={() => setActiveTab('adventures')}
        style={{
          flex: 1,
          height: 70,
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
            alt="Дім"
            src={Adv.src}
            style={{
              width: 60,
              height: 60,
              objectFit: 'contain',
              borderRadius: '100%',
              padding: 1,
              boxSizing: 'border-box',
              marginBottom: -5,
            }}
          />
          <Placeholder
            style={{
              fontSize: 12,
              fontWeight: 'lighter',
              color: activeTab === 'adventures' ? 'rgb(255, 255, 255)' : 'gray',
              marginTop: -30,
              textAlign: 'center',
            }}
          >
            ПРИГОДИ
          </Placeholder>
        </div>
      </Button>
    </div> 
  );
}