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
// import { HOME_NAV_ID } from 'app/core/reducers/navModel';
// import { useSelector } from 'app/types';
// import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
// import { buildBreadcrumbs } from '../Breadcrumbs/utils';
// import { NavToolbarSeparator } from './NavToolbarSeparator';
// END
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
  // sectionNav,
  // pageNav,
  // onToggleMegaMenu,
  // END
  onToggleSearchBar,
  onToggleKioskMode,
}: Props) {
  const styles = useStyles2(getStyles);
  // @Copyright 2023 BMC Software, Inc.
  // Date - 06/12/2023
  // Commented unused imports

  // const homeNav = useSelector((state) => state.navIndex)[HOME_NAV_ID];
  // const breadcrumbs = buildBreadcrumbs(sectionNav, pageNav, homeNav);

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

      {/*
      // @Copyright 2023 BMC Software, Inc.
      // Date - 06/12/2023
      // Hide Breadcrumbs
     <Breadcrumbs breadcrumbs={breadcrumbs} className={styles.breadcrumbs} />
     // END*/}
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
