import { DataSourcePluginMeta } from '@grafana/data';
import { Button } from '@grafana/ui';
import { getFeatureStatus, FEATURE_CONST } from 'app/features/dashboard/services/featureFlagSrv';
import { addDataSource } from 'app/features/datasources/state/actions';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { isDataSourceEditor } from '../../permissions';
import { CatalogPlugin } from '../../types';

type Props = {
  plugin: CatalogPlugin;
};

export function GetStartedWithDataSource({ plugin }: Props): React.ReactElement | null {
  const dispatch = useDispatch();
  const onAddDataSource = useCallback(() => {
    const meta = {
      name: plugin.name,
      id: plugin.id,
    } as DataSourcePluginMeta;

    dispatch(addDataSource(meta));
  }, [dispatch, plugin]);

  if (!isDataSourceEditor()) {
    return null;
  }

  return (
    // BMC code - inline change
    <Button
      variant="primary"
      onClick={onAddDataSource}
      disabled={!getFeatureStatus(FEATURE_CONST.DASHBOARDS_SSRF_FEATURE_NAME)}
    >
      Create a {plugin.name} data source
    </Button>
  );
}
