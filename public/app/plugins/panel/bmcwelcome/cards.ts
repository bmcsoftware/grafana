import { CustomConfiguration } from 'app/features/org/state/configuration';
import { Card } from './types';

export const getCards = (config: CustomConfiguration): Card[] => [
  {
    type: 'help',
    heading: 'Documentation',
    info: 'Go through the product documentation to understand all the Reporting features and how to use them.',
    icon: 'public/app/plugins/panel/bmcwelcome/img/documentation.svg',
    iconWidth: 24,
    iconHeight: 30,
    href: config.docLink,
  },
  {
    type: 'help',
    heading: 'Videos',
    info: 'View video how-tos, overviews, and demos about BMC products and solutions on the BMC YouTube channel.',
    icon: 'public/app/plugins/panel/bmcwelcome/img/videos.svg',
    iconWidth: 24,
    iconHeight: 24,
    href: config.videoLink,
  },
  {
    type: 'help',
    heading: 'Communities',
    info: 'Connect. Share. Discover. Join discussions with peers and experts on BMC products and solutions.',
    icon: 'public/app/plugins/panel/bmcwelcome/img/communities.svg',
    iconWidth: 36,
    iconHeight: 21,
    href: config.communityLink,
  },
];
