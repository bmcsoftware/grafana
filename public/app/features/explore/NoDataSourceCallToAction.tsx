import { css } from '@emotion/css';
import React from 'react';

import { LinkButton, CallToActionCard, Icon, useTheme2 } from '@grafana/ui';
import { contextSrv } from 'app/core/core';
import { AccessControlAction } from 'app/types';

import { FEATURE_CONST, getFeatureStatus } from '../dashboard/services/featureFlagSrv';
import { isGrafanaAdmin } from '../plugins/admin/permissions';
export const NoDataSourceCallToAction = () => {
  const theme = useTheme2();

  const canCreateDataSource =
    (contextSrv.hasPermission(AccessControlAction.DataSourcesCreate) &&
      contextSrv.hasPermission(AccessControlAction.DataSourcesWrite) &&
      getFeatureStatus(FEATURE_CONST.DASHBOARDS_SSRF_FEATURE_NAME)) ||
    isGrafanaAdmin();

  const message =
    'Explore requires at least one data source. Once you have added a data source, you can query it here.';
  const footer = (
    <>
      <Icon name="rocket" />
      <> ProTip: You can also define data sources through configuration files. </>
      <a
        href="http://docs.grafana.org/administration/provisioning/#datasources?utm_source=explore"
        target="_blank"
        rel="noreferrer"
        className="text-link"
      >
        Learn more
      </a>
    </>
  );

  const ctaElement = (
    <LinkButton size="lg" href="datasources/new" icon="database" disabled={!canCreateDataSource}>
      Add data source
    </LinkButton>
  );

  const cardClassName = css`
    max-width: ${theme.breakpoints.values.lg}px;
    margin-top: ${theme.spacing(2)};
    align-self: center;
  `;

  return (
    <CallToActionCard callToActionElement={ctaElement} className={cardClassName} footer={footer} message={message} />
  );
};
