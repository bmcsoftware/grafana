import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { NavLandingPage } from 'app/core/components/AppChrome/NavLandingPage';
import { DataSourcesRoutesContext } from 'app/features/datasources/state';
import { StoreState, useSelector } from 'app/types';

import { FEATURE_CONST, getFeatureStatus } from '../dashboard/services/featureFlagSrv';
import { isGrafanaAdmin } from '../plugins/admin/permissions';

import { ROUTES } from './constants';
import {
  ConnectDataPage,
  DataSourceDashboardsPage,
  DataSourceDetailsPage,
  DataSourcesListPage,
  EditDataSourcePage,
  NewDataSourcePage,
} from './pages';

export default function Connections() {
  const navIndex = useSelector((state: StoreState) => state.navIndex);
  const isConnectDataPageOverriden = Boolean(navIndex['standalone-plugin-page-/connections/connect-data']);

  const YourConnectionsPage =
    navIndex['connections-your-connections'].children && navIndex['connections-your-connections'].children?.length > 1
      ? () => <NavLandingPage navId="connections-your-connections" />
      : () => <Redirect to={ROUTES.DataSources} />;

  return (
    <DataSourcesRoutesContext.Provider
      value={{
        New: ROUTES.DataSourcesNew,
        List: ROUTES.DataSources,
        Edit: ROUTES.DataSourcesEdit,
        Dashboards: ROUTES.DataSourcesDashboards,
      }}
    >
      <Switch>
        {/* Redirect to "Connect data" by default */}
        <Route
          exact
          sensitive
          path={ROUTES.Base}
          // BMC Change Inline: Redirect to your connection page for non super admin
          component={() => <Redirect to={isGrafanaAdmin() ? ROUTES.ConnectData : ROUTES.YourConnections} />}
        />
        <Route exact sensitive path={ROUTES.YourConnections} component={YourConnectionsPage} />
        <Route exact sensitive path={ROUTES.DataSources} component={DataSourcesListPage} />
        <Route exact sensitive path={ROUTES.DataSourcesDetails} component={DataSourceDetailsPage} />
        {getFeatureStatus(FEATURE_CONST.DASHBOARDS_SSRF_FEATURE_NAME) || isGrafanaAdmin() ? (
          <Route exact sensitive path={ROUTES.DataSourcesNew} component={NewDataSourcePage} />
        ) : null}
        <Route exact sensitive path={ROUTES.DataSourcesEdit} component={EditDataSourcePage} />
        <Route exact sensitive path={ROUTES.DataSourcesDashboards} component={DataSourceDashboardsPage} />

        {/* "Connect data" page - we don't register a route in case a plugin already registers a standalone page for it */}
        {!isConnectDataPageOverriden && <Route exact sensitive path={ROUTES.ConnectData} component={ConnectDataPage} />}

        {/* Not found */}
        <Route component={() => <Redirect to="/notfound" />} />
      </Switch>
    </DataSourcesRoutesContext.Provider>
  );
}
