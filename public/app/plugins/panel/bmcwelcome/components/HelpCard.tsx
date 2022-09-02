import React, { FC } from 'react';
import { Card } from '../types';
import { stylesFactory, useTheme } from '@grafana/ui';
import { GrafanaTheme } from '@grafana/data';
import { css } from 'emotion';

interface Props {
  card: Card;
}

export const HelpCard: FC<Props> = ({ card }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const cardWidth = card.iconWidth ? card.iconWidth : 24;
  const cardHeight = card.iconHeight ? card.iconHeight : 24;

  return (
    <div className={styles.card}>
      <a href={card.href} target="_blank" rel="noreferrer">
        <div className={styles.cardContent}>
          <div className={styles.cardIconContainer}>
            <img src={card.icon} width={cardWidth} height={cardHeight} />
          </div>
          <div className={styles.heading}>{card.heading}</div>
          <span className={styles.info}>{card.info}</span>
        </div>
      </a>
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  const hoverColor = theme.isDark ? theme.palette.gray25 : theme.palette.gray95;

  return {
    card: css`
      width: 269px;
      min-width: 269px;
      height: 146px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background-color: ${hoverColor};
        opacity: 0.9;
      }

      @media only screen and (max-width: ${theme.breakpoints.sm}) {
        width: 100%;
        min-width: 110px;
        height: 70px;
      }
    `,
    cardContent: css`
      padding: 16px 16px;

      @media only screen and (max-width: ${theme.breakpoints.sm}) {
        padding: 12px 10px;
      }
    `,
    cardIconContainer: css`
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    `,
    heading: css`
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0;
      line-height: 18px;
      text-transform: uppercase;
      margin-top: ${theme.spacing.sm};
      margin-bottom: ${theme.spacing.sm};

      @media only screen and (max-width: ${theme.breakpoints.sm}) {
        margin-bottom: 0;
      }
    `,
    info: css`
      line-height: 18px;
      font-size: 13px;
      color: ${theme.palette.gray60};

      @media only screen and (max-width: ${theme.breakpoints.sm}) {
        display: none;
      }
    `,
  };
});
