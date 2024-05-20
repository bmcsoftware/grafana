import React from 'react';
import { Redirect } from 'react-router-dom';

import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
// import config from 'app/core/config';
import { RouteDescriptor } from 'app/core/navigation/types';

import { isGrafanaAdmin } from './permissions';
import { PluginAdminRoutes } from './types';

const DEFAULT_ROUTES = [
  {
    path: '/plugins',
    navId: 'plugins',
    routeName: PluginAdminRoutes.Home,
    // BMC code - inline change
    roles: () => {
      return isGrafanaAdmin() ? [] : ['Reject'];
    },
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginListPage" */ './pages/Browse')),
  },
  {
    path: '/plugins/browse',
    navId: 'plugins',
    routeName: PluginAdminRoutes.Browse,
    // BMC code - inline change
    roles: () => {
      return isGrafanaAdmin() ? [] : ['Reject'];
    },
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginListPage" */ './pages/Browse')),
  },
  {
    path: '/plugins/:pluginId/',
    navId: 'plugins',
    routeName: PluginAdminRoutes.Details,
    // BMC code - inline change
    roles: () => {
      return isGrafanaAdmin() ? [] : ['Reject'];
    },
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginPage" */ './pages/PluginDetails')),
  },
  {
    path: '/admin/plugins/*',
    navId: 'admin-plugins',
    component: () => <Redirect to="/plugins" />,
  },
];

export function getRoutes(): RouteDescriptor[] {
  return DEFAULT_ROUTES;
}
