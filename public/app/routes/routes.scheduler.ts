import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
import { config } from 'app/core/config';
import { RouteDescriptor } from 'app/core/navigation/types';

export function getReportSchedulerRoutes(cfg = config): RouteDescriptor[] {
  return [
    {
      path: '/reports',
      exact: true,
      roles: () => ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportsListPage" */ 'app/features/reports/reports-list/components/ReportsListPage'
          )
      ),
    },
    {
      path: '/reports/branding',
      roles: () => ['Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportSettingsPage" */ 'app/features/reports/report-settings/components/ReportSettingsPage'
          )
      ),
    },
    {
      path: '/reports/history',
      roles: () => ['Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportConsolePage" */ 'app/features/reports/report-console/components/ReportConsolePage'
          )
      ),
    },
    {
      path: '/reports/history/f/:folderUid',
      roles: () => ['Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportConsolePage" */ 'app/features/reports/report-console/components/ReportConsolePage'
          )
      ),
    },
    {
      path: '/reports/d/:uid',
      roles: () => ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportsListPage" */ 'app/features/reports/reports-list/components/ReportsListPage'
          )
      ),
    },
    {
      path: '/reports/:action/:id?',
      roles: () => ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportDistributionPage" */ 'app/features/reports/manage-report/components/ReportDistributionPage'
          )
      ),
    },
    {
      path: '/reports/d/:uid/:action/:id?',
      roles: () => ['Editor', 'Admin'],
      component: SafeDynamicImport(
        () =>
          import(
            /* webpackChunkName: "ReportDistributionPage"*/ 'app/features/reports/manage-report/components/ReportDistributionPage'
          )
      ),
    },
  ];
}
