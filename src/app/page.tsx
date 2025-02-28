'use client';

import { List, Placeholder,Button } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { Link } from '@/components/Link/Link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher/LocaleSwitcher';
import { Page } from '@/components/Page';
import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';

export default function Home() {
  const t = useTranslations('i18n');

  return (
    <Page back={false}>
      <List>
        <TopBar />
        <div className="HIJtihMA8FHczS02iWF5">
          <Placeholder
            action={<Button size="l" stretched>Join group</Button>}
            description="We are sorry, but the page building is in progress. Please come back later."
            header="Hmmm, something went wrong"
          >
            <img
              alt="Telegram sticker"
              className="blt0jZBzpxuR4oDhJc8s"
              src="https://xelene.me/telegram.gif"
              style={{  width: '40%', 
                height: 'auto', 
                margin: '0 auto',
                display: 'block'
              }}
            />
          </Placeholder>
        </div>
      </List>
      <BottomBar />
    </Page>
  );
}