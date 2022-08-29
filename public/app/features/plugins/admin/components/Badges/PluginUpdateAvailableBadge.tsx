import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

import { CatalogPlugin } from '../../types';

type Props = {
  plugin: CatalogPlugin;
};

export function PluginUpdateAvailableBadge({ plugin }: Props): React.ReactElement | null {

  // Currently renderer plugins are not supported by the catalog due to complications related to installation / update / uninstall.
  // BMC Code : Comment below block
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
