import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
import { config } from 'app/core/config';
import { contextSrv } from 'app/core/core';
import { RouteDescriptor } from 'app/core/navigation/types';
import { getFeatureStatus, FEATURE_CONST } from 'app/features/dashboard/services/featureFlagSrv';

export const getCalcFieldRoutes = (cfg = config): RouteDescriptor[] => {
  return [
    {
      path: '/calculated-fields',
      exact: true,
      roles: () =>
        getFeatureStatus(FEATURE_CONST.RBAC)
          ? contextSrv.evaluatePermission(() => ['Editor', 'Admin'], ['calculated.fields:read'])
          : ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportsListPage" */ 'app/features/calculated-fields/List/components/CalculatedFieldsList'
          )
      ),
    },
    {
      path: '/calculated-fields/:action/:uid?',
      roles: () =>
        getFeatureStatus(FEATURE_CONST.RBAC)
          ? contextSrv.evaluatePermission(() => ['Editor', 'Admin'], ['calculated.fields:create'])
          : ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportsListPage" */ 'app/features/calculated-fields/Modify/components/CalculatedFieldsModify'
          )
      ),
    },
  ];
};
