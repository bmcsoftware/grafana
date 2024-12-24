import React, { useCallback } from 'react';

import { DataSourcePluginMeta } from '@grafana/data';
import { config } from '@grafana/runtime';
import { Button } from '@grafana/ui';
import { getFeatureStatus, FEATURE_CONST } from 'app/features/dashboard/services/featureFlagSrv';
import { useDataSourcesRoutes, addDataSource } from 'app/features/datasources/state';
import { useDispatch } from 'app/types';

import { isDataSourceEditor, isGrafanaAdmin } from '../../permissions';
import { CatalogPlugin } from '../../types';

type Props = {
  plugin: CatalogPlugin;
};

export function GetStartedWithDataSource({ plugin }: Props): React.ReactElement | null {
  const dispatch = useDispatch();
  const dataSourcesRoutes = useDataSourcesRoutes();
  const onAddDataSource = useCallback(() => {
    const meta = {
      name: plugin.name,
      id: plugin.id,
    } as DataSourcePluginMeta;

    dispatch(addDataSource(meta, dataSourcesRoutes.Edit));
  }, [dispatch, plugin, dataSourcesRoutes]);

  if (!isDataSourceEditor()) {
    return null;
  }

  // BMC code - next line
  const canCreateDataSource = getFeatureStatus(FEATURE_CONST.DASHBOARDS_SSRF_FEATURE_NAME) || isGrafanaAdmin();
  const disabledButton =
    config.featureToggles.managedPluginsInstall && config.pluginAdminExternalManageEnabled && !plugin.isFullyInstalled;

  return (
    <Button
      variant="primary"
      onClick={onAddDataSource}
      // BMC Code: Next Inline
      disabled={disabledButton || !canCreateDataSource}
      title={
        disabledButton ? "The plugin isn't usable yet, it may take some time to complete the installation." : undefined
      }
    >
      Add new data source
    </Button>
  );
}
