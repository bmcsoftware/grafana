export type CardType = 'help';

export interface Card {
  type: CardType;
  heading: string;
  info: string;
  icon?: string;
  iconWidth?: number;
  iconHeight?: number;
  href?: string;
}
