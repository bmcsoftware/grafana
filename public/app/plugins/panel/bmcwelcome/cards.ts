import { CustomConfiguration } from 'app/features/org/state/configuration';

import { Card, Description } from './types';

export const defaultDescr = {
  doc: 'Go through the product documentation to understand all the Reporting features and how to use them.',
  video: 'View video how-tos, overviews, and demos about BMC products and solutions on the BMC YouTube channel.',
  community: 'Connect. Share. Discover. Join discussions with peers and experts on BMC products and solutions.',
};

interface CompositeConfig extends CustomConfiguration {
  descr: Description;
}

export const getCards = (config: CompositeConfig): Card[] => [
  {
    id: 'doc',
    type: 'help',
    heading: 'Documentation',
    info: config.descr.doc,
    icon: 'public/app/plugins/panel/bmcwelcome/img/documentation.svg',
    iconWidth: 24,
    iconHeight: 30,
    href: config.docLink,
  },
  {
    id: 'video',
    type: 'help',
    heading: 'Videos',
    info: config.descr.video,
    icon: 'public/app/plugins/panel/bmcwelcome/img/videos.svg',
    iconWidth: 24,
    iconHeight: 24,
    href: config.videoLink,
  },
  {
    id: 'community',
    type: 'help',
    heading: 'Communities',
    info: config.descr.community,
    icon: 'public/app/plugins/panel/bmcwelcome/img/communities.svg',
    iconWidth: 36,
    iconHeight: 21,
    href: config.communityLink,
  },
];
