'use client';

import { Section, Cell, Image, List, Button } from '@telegram-apps/telegram-ui';
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
        <Section
          header="Application Launch Data"
          footer="These pages help developer to learn more about current launch information"
        >
        </Section>
        <Section header={t('header')} footer={t('footer')}>
          <LocaleSwitcher/>
        </Section>
      </List>
      <BottomBar />
    </Page>
  );
}