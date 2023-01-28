import { css } from '@emotion/css';
import React, { FC } from 'react';

import { config } from '@grafana/runtime';
import { stylesFactory } from '@grafana/ui';
import { customConfigSrv } from 'app/features/org/state/configuration';

import { getCards } from './cards';
import { HelpCard } from './components/HelpCard';
import { Card, Options } from './types';

interface HelpCardsProps {
  options: Options;
}

export const HelpCards: FC<HelpCardsProps> = ({ options }) => {
  // BMC code - begin
  const [cards, setCards] = React.useState<Card[]>([]);

  React.useEffect(() => {
    customConfigSrv.getCustomConfiguration().then((data) => {
      setCards(getCards({ ...data, descr: options.descr }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const newCards = cards.map((card: Card) => {
      return {
        ...card,
        info: options.descr[card.id],
      };
    });
    if (newCards.length) {
      setCards(newCards);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.descr]);
  // BMC code - end

  const styles = getStyles();
  return (
    <div className={styles.cards}>
      {cards.map((card: Card, index: number) => {
        const key = `${card.type}-${index}`;
        const containerKey = 'container' + key;
        const dividerKey = 'divider' + key;
        return (
          <div key={containerKey} className={styles.cardContainer}>
            {index > 0 && <div key={dividerKey} className={styles.divider}></div>}
            <HelpCard key={key} card={card} />
          </div>
        );
      })}
    </div>
  );
};

const getStyles = stylesFactory(() => {
  const { theme } = config;

  return {
    cards: css`
      display: flex;
      align-items: center;
      justify-content: center;

      @media only screen and (max-width: ${theme.breakpoints.xxl}) {
        justify-content: flex-start;
        width: 100%;
      }
    `,
    cardContainer: css`
      display: flex;
      align-items: center;
      text-align: center;
      width: 100%;
    `,
    divider: css`
      margin: 0 ${theme.spacing.sm};
      height: 69px;
      border-left-style: solid;
      border-left-width: 2px;
      border-left-color: ${theme.palette.gray95};

      @media only screen and (max-width: ${theme.breakpoints.sm}) {
        height: 32px;
      }
    `,
  };
});
