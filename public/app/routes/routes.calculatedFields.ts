import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
import { config } from 'app/core/config';
import { RouteDescriptor } from 'app/core/navigation/types';

export const getCalcFieldRoutes = (cfg = config): RouteDescriptor[] => {
  return [
    {
      path: '/calculated-fields',
      exact: true,
      roles: () => ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportsListPage" */ 'app/features/calculated-fields/List/components/CalculatedFieldsList'
          )
      ),
    },
    {
      path: '/calculated-fields/:action/:uid?',
      roles: () => ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportsListPage" */ 'app/features/calculated-fields/Modify/components/CalculatedFieldsModify'
          )
      ),
    },
  ];
};
