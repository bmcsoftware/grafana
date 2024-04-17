import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
// BMC code - comment next line
// import { useStyles2 } from '@grafana/ui';

import { CatalogPlugin } from '../../types';

type Props = {
  plugin: CatalogPlugin;
};

export function PluginUpdateAvailableBadge({ plugin }: Props): React.ReactElement | null {
  // BMC Code : Comment below block
  // const styles = useStyles2(getStyles);

  // Currently renderer plugins are not supported by the catalog due to complications related to installation / update / uninstall.
  // if (plugin.hasUpdate && !plugin.isCore && plugin.type !== PluginType.renderer) {
  //   return <p className={styles.hasUpdate}>Update available!</p>;
  // }
  // End

  return null;
}

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    hasUpdate: css`
      color: ${theme.colors.text.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
      margin-bottom: 0;
    `,
  };
};
