import { Location } from 'history';

import { locationUtil, NavModelItem } from '@grafana/data';
import { config, reportInteraction } from '@grafana/runtime';
import { t } from 'app/core/internationalization';

import { ShowModalReactEvent } from '../../../../types/events';
import appEvents from '../../../app_events';
import { getFooterLinks } from '../../Footer/Footer';
import { HelpModal } from '../../help/HelpModal';

export const enrichHelpItem = (helpItem: NavModelItem, footerLinkData?: any) => {
  let menuItems = helpItem.children || [];

  if (helpItem.id === 'help') {
    const onOpenShortcuts = () => {
      appEvents.publish(new ShowModalReactEvent({ component: HelpModal }));
    };
    helpItem.children = [
      ...menuItems,
      // BMC code - Update footer data and Hide "open source" item from Help menu
      ...getFooterLinks(footerLinkData),
      // ...getEditionAndUpdateLinks(),
      {
        id: 'keyboard-shortcuts',
        text: t('nav.help/keyboard-shortcuts', 'Keyboard shortcuts'),
        icon: 'keyboard',
        onClick: onOpenShortcuts,
      },
    ];
  }
  return helpItem;
};

export const enrichWithInteractionTracking = (item: NavModelItem, megaMenuDockedState: boolean) => {
  // creating a new object here to not mutate the original item object
  const newItem = { ...item };
  const onClick = newItem.onClick;
  newItem.onClick = () => {
    reportInteraction('grafana_navigation_item_clicked', {
      path: newItem.url ?? newItem.id,
      menuIsDocked: megaMenuDockedState,
    });
    onClick?.();
  };
  if (newItem.children) {
    newItem.children = newItem.children.map((item) => enrichWithInteractionTracking(item, megaMenuDockedState));
  }
  return newItem;
};

export const isMatchOrChildMatch = (itemToCheck: NavModelItem, searchItem?: NavModelItem) => {
  return Boolean(itemToCheck === searchItem || hasChildMatch(itemToCheck, searchItem));
};

export const hasChildMatch = (itemToCheck: NavModelItem, searchItem?: NavModelItem): boolean => {
  return Boolean(
    itemToCheck.children?.some((child) => {
      if (child === searchItem) {
        return true;
      } else {
        return hasChildMatch(child, searchItem);
      }
    })
  );
};

const stripQueryParams = (url?: string) => {
  return url?.split('?')[0] ?? '';
};

const isBetterMatch = (newMatch: NavModelItem, currentMatch?: NavModelItem) => {
  const currentMatchUrl = stripQueryParams(currentMatch?.url);
  const newMatchUrl = stripQueryParams(newMatch.url);
  return newMatchUrl && newMatchUrl.length > currentMatchUrl?.length;
};

export const getActiveItem = (
  navTree: NavModelItem[],
  pathname: string,
  currentBestMatch?: NavModelItem
): NavModelItem | undefined => {
  const dashboardLinkMatch = '/dashboards';

  for (const link of navTree) {
    const linkWithoutParams = stripQueryParams(link.url);
    // BMC code - inline change
    const linkPathname = locationUtil
      .stripBaseFromUrl(linkWithoutParams)
      .replace(/^\/dashboards$/, '/')
      .replace(/^\/dashboards/, '');
    if (linkPathname && link.id !== 'starred') {
      if (linkPathname === pathname) {
        // exact match
        currentBestMatch = link;
        break;
      } else if (linkPathname !== '/' && pathname.startsWith(linkPathname)) {
        // partial match
        if (isBetterMatch(link, currentBestMatch)) {
          currentBestMatch = link;
        }
      } else if (linkPathname === '/alerting/list' && pathname.startsWith('/alerting/notification/')) {
        // alert channel match
        // TODO refactor routes such that we don't need this custom logic
        currentBestMatch = link;
        break;
      } else if (linkPathname === dashboardLinkMatch && pathname.startsWith('/d/')) {
        // dashboard match
        // TODO refactor routes such that we don't need this custom logic
        if (isBetterMatch(link, currentBestMatch)) {
          currentBestMatch = link;
        }
      }
    }
    if (link.children) {
      currentBestMatch = getActiveItem(link.children, pathname, currentBestMatch);
    }
    if (stripQueryParams(currentBestMatch?.url) === pathname) {
      return currentBestMatch;
    }
  }
  return currentBestMatch;
};

export const isSearchActive = (location: Location<unknown>) => {
  const query = new URLSearchParams(location.search);
  return query.get('search') === 'open';
};

export function getNavModelItemKey(item: NavModelItem) {
  return item.id ?? item.text;
}
// BMC code
export const prepareLogoColor = (isSelected: Boolean) => {
  const reportApp: any = document.querySelector('a[aria-label="Report Scheduler"] img') || { style: {} };
  if (config.theme.isDark) {
    reportApp.style['filter'] = `contrast(0) ${isSelected ? 'brightness(1.8)' : 'brightness(1.2)'}`;
  } else {
    reportApp.style['filter'] = `${isSelected ? 'inherit' : 'contrast(0.35)'}`;
  }
};
// End

export function getEditionAndUpdateLinks(): NavModelItem[] {
  const { buildInfo, licenseInfo } = config;
  const stateInfo = licenseInfo.stateInfo ? ` (${licenseInfo.stateInfo})` : '';
  const links: NavModelItem[] = [];

  links.push({
    target: '_blank',
    id: 'version',
    text: `${buildInfo.edition}${stateInfo}`,
    url: licenseInfo.licenseUrl,
    icon: 'external-link-alt',
  });

  if (buildInfo.hasUpdate) {
    links.push({
      target: '_blank',
      id: 'updateVersion',
      text: `New version available!`,
      icon: 'download-alt',
      url: 'https://grafana.com/grafana/download?utm_source=grafana_footer',
    });
  }

  return links;
}
