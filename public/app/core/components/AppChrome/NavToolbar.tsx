import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2, NavModelItem } from '@grafana/data';
import { Components } from '@grafana/e2e-selectors';
import { useStyles2 } from '@grafana/ui';
// @Copyright 2023 BMC Software, Inc.
// Date - 06/12/2023
// Commented unused imports
// import { Icon, ToolbarButton, useStyles2 } from '@grafana/ui';
// import { t } from 'app/core/internationalization';
// import { NavToolbarSeparator } from './NavToolbarSeparator';
// END
import { HOME_NAV_ID } from 'app/core/reducers/navModel';
import { useSelector } from 'app/types';

import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { buildBreadcrumbs } from '../Breadcrumbs/utils';

import { TOP_BAR_LEVEL_HEIGHT } from './types';

export interface Props {
  onToggleSearchBar(): void;
  onToggleMegaMenu(): void;
  onToggleKioskMode(): void;
  searchBarHidden?: boolean;
  sectionNav: NavModelItem;
  pageNav?: NavModelItem;
  actions: React.ReactNode;
}

export function NavToolbar({
  actions,
  // @Copyright 2023 BMC Software, Inc.
  // Date - 06/12/2023
  // Commented unused imports
  // searchBarHidden,
  // onToggleMegaMenu,
  // onToggleSearchBar,
  // onToggleKioskMode,
  // END
  sectionNav,
  pageNav,
}: Props) {
  const styles = useStyles2(getStyles);

  /*
    @Copyright 2023 BMC Software, Inc.
    Date - 06/12/2023
    Logic to show breadcrumbs for view panel
  */

  const homeNav = useSelector((state) => state.navIndex)[HOME_NAV_ID];
  let breadcrumbs = buildBreadcrumbs(sectionNav, pageNav, homeNav);
  breadcrumbs = breadcrumbs.slice(Math.max(breadcrumbs.length - 2, 0));
  breadcrumbs = breadcrumbs.filter(
    (each) =>
      each.text.toLowerCase() === 'view panel' ||
      each.text.toLowerCase().startsWith('playback') ||
      each.text.toLowerCase().startsWith('realtime')
  );
  if (breadcrumbs.length > 1) {
    breadcrumbs = breadcrumbs.map((each) => {
      if (each.text.toLowerCase().startsWith('playback') || each.text.toLowerCase().startsWith('realtime')) {
        return {
          ...each,
          text: 'Dashboard',
        };
      } else {
        return each;
      }
    });
  } else {
    breadcrumbs = [];
  }
  // END

  return (
    <div data-testid={Components.NavToolbar.container} className={styles.pageToolbar}>
      {/*
        // @Copyright 2023 BMC Software, Inc.
        // Date - 06/12/2023
        // Hide Sidebar menu icon
      <div className={styles.menuButton}>
        <IconButton
          name="bars"
          tooltip={t('navigation.toolbar.toggle-menu', 'Toggle menu')}
          tooltipPlacement="bottom"
          size="xl"
          onClick={onToggleMegaMenu}
        />
      </div>
      // END*/}
      <Breadcrumbs breadcrumbs={breadcrumbs} className={styles.breadcrumbs} />
      <div className={styles.actions}>
        {actions}
        {/*
        // @Copyright 2023 BMC Software, Inc.
        // Date - 06/12/2023
        // Hide separator, kiosk mode icon and serachbar
        {actions && <NavToolbarSeparator />}
        {searchBarHidden && (
          <ToolbarButton
            onClick={onToggleKioskMode}
            narrow
            title={t('navigation.toolbar.enable-kiosk', 'Enable kiosk mode')}
            icon="monitor"
          />
        )}*/}
        {/*  <ToolbarButton
          onClick={onToggleSearchBar}
          narrow
          title={t('navigation.toolbar.toggle-search-bar', 'Toggle top search bar')}
        >
          <Icon name={searchBarHidden ? 'angle-down' : 'angle-up'} size="xl" />
        </ToolbarButton>
        //END */}
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    breadcrumbs: css({
      maxWidth: '50%',
    }),
    pageToolbar: css({
      height: TOP_BAR_LEVEL_HEIGHT,
      display: 'flex',
      padding: theme.spacing(0, 1, 0, 2),
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
    menuButton: css({
      display: 'flex',
      alignItems: 'center',
      marginRight: theme.spacing(1),
    }),
    actions: css({
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      justifyContent: 'flex-end',
      paddingLeft: theme.spacing(1),
      flexGrow: 1,
      gap: theme.spacing(0.5),
      minWidth: 0,
    }),
  };
};
