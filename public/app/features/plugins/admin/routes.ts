import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
import config from 'app/core/config';
import { RouteDescriptor } from 'app/core/navigation/types';
import { isGrafanaAdmin } from './permissions';
import { PluginAdminRoutes } from './types';

const DEFAULT_ROUTES = [
  {
    path: '/plugins',
    routeName: PluginAdminRoutes.Home,
    roles: !config.pluginAdminEnabled ? () => ['Editor', 'Admin'] : undefined,
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginListPage" */ './pages/Browse')),
  },
  {
    path: '/plugins/browse',
    routeName: PluginAdminRoutes.Browse,
    roles: !config.pluginAdminEnabled ? () => ['Editor', 'Admin'] : undefined,
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginListPage" */ './pages/Browse')),
  },
  {
    path: '/plugins/:pluginId/',
    routeName: PluginAdminRoutes.Details,
    roles: !config.pluginAdminEnabled ? () => ['Editor', 'Admin'] : undefined,
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginPage" */ './pages/PluginDetails')),
  },
];

const ADMIN_ROUTES = [
  {
    path: '/admin/plugins',
    routeName: PluginAdminRoutes.HomeAdmin,
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginListPage" */ './pages/Browse')),
  },
  {
    path: '/admin/plugins/browse',
    routeName: PluginAdminRoutes.BrowseAdmin,
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginListPage" */ './pages/Browse')),
  },
  {
    path: '/admin/plugins/:pluginId/',
    routeName: PluginAdminRoutes.DetailsAdmin,
    component: SafeDynamicImport(() => import(/* webpackChunkName: "PluginPage" */ './pages/PluginDetails')),
  },
];

export function getRoutes(): RouteDescriptor[] {
  if (isGrafanaAdmin()) {
    return [...DEFAULT_ROUTES, ...ADMIN_ROUTES];
  }

  return DEFAULT_ROUTES;
}
