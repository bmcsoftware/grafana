import React from 'react';

import { config } from '@grafana/runtime';
import { LinkButton } from '@grafana/ui';
import { contextSrv } from 'app/core/core';
import { Trans } from 'app/core/internationalization';
import { FEATURE_CONST, getFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';
import { isGrafanaAdmin } from 'app/features/plugins/admin/permissions';
import { AccessControlAction } from 'app/types';

import { useDataSourcesRoutes } from '../state';

export function DataSourceAddButton(): JSX.Element | null {
  // BMC code - updated condition for canCreateDataSource
  const canCreateDataSource =
    (contextSrv.hasPermission(AccessControlAction.DataSourcesCreate) &&
      getFeatureStatus(FEATURE_CONST.DASHBOARDS_SSRF_FEATURE_NAME)) ||
    isGrafanaAdmin();
  const dataSourcesRoutes = useDataSourcesRoutes();

  return (
    // BMC Code change: Make button disable instead of removing
    <LinkButton icon="plus" href={config.appSubUrl + dataSourcesRoutes.New} disabled={!canCreateDataSource}>
      <Trans i18nKey="data-sources.datasource-add-button.label">Add new data source</Trans>
    </LinkButton>
  );
}
