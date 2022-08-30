import { AppEvents } from '@grafana/data';
import { buildHostUrl } from 'app/features/dashboard/components/ShareModal/utils';
import { ReportSearchItemType, ReportSection, ReportSectionItem } from 'app/features/reports/reports-list/types';
import { sortBy, values, clone } from 'lodash';
import { appEvents } from '../core';
import { backendSrv } from './backend_srv';

interface Sections {
  [key: string]: Partial<ReportSection>;
}

export class ReportsSrv {
  getSortOptions() {
    return Promise.resolve({
      sortOptions: [
        {
          name: 'alpha-asc',
          displayName: 'Alphabetically (A-Z)',
          description: 'Sort results in an alphabetically ascending order',
        },
        {
          name: 'alpha-desc',
          displayName: 'Alphabetically (Z-A)',
          description: 'Sort results in an alphabetically descending order',
        },
      ],
    });
  }

  deleteReports(ids: number[]) {
    return backendSrv.post('/api/reports/delete', { ids: ids });
  }

  enableReports(ids: number[]) {
    return backendSrv.post('/api/reports/enable', { ids: ids });
  }

  disableReports(ids: number[]) {
    return backendSrv.post('/api/reports/disable', { ids: ids });
  }

  getTenantUsers(query: string) {
    return backendSrv.get(`/api/reports/tenant/users?query=${query || ''}`);
  }

  getReportSettings() {
    return backendSrv.get(`/api/reports/settings/branding`);
  }

  setReportSettings(data: any) {
    return backendSrv.post('/api/reports/settings/branding', data);
  }

  resetReportSettings() {
    return backendSrv.delete('/api/reports/settings/branding');
  }

  getReportsQueue(query = '') {
    return backendSrv.get('/api/reports/job/info', { query });
  }

  async getReportsJobsQueue(id?: number) {
    if (!id) {
      return;
    }
    return await backendSrv.get(`/api/reports/${id}/job`);
  }

  getReportById(id: number) {
    return backendSrv.get(`/api/reports/${id}`);
  }

  async executeReports(ids: number[]) {
    appEvents.emit(AppEvents.alertSuccess, ['Execution in progress']);

    const res = await fetch(`${buildHostUrl()}/api/reports/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (res.status === 503) {
      const message = 'Report generation in progress...';
      appEvents.emit(AppEvents.alertSuccess, [message]);
      return;
    }

    if (res.status === 500) {
      const data = await res.json();
      appEvents.emit(AppEvents.alertError, [data.message || 'Execution failed']);
      return;
    }

    appEvents.emit(AppEvents.alertSuccess, ['Report executed successfully']);
  }

  getReports(options: any, dashboard?: any) {
    const sections: any = {};
    const promises = [];
    const query = clone(options);
    const hasSearchFilter = query.query?.length > 0;
    const hasDashboardFilter = dashboard ? true : false;

    const handleError = (error: any) => {
      let message = error.data.Message ? error.data.Message : 'Failed to load reports';
      appEvents.emit(AppEvents.alertError, [message]);
    };

    promises.push(
      backendSrv.search({ type: 'dash-db', limit: 5000 }).then((results) => {
        const dashboardsList = results.map((dashItem) => {
          return { title: dashItem.title, id: dashItem.id, uid: dashItem.uid };
        });
        let queryParam = '?';
        if (hasSearchFilter) {
          queryParam += `query=${encodeURIComponent(query.query)}&`;
        }
        if (hasDashboardFilter) {
          queryParam += `folderId=${dashboard.id}&`;
        }
        return backendSrv.get(`/api/reports${queryParam}`).then(
          (res) => {
            this.handleGetReportsResult(sections, res, dashboardsList, hasSearchFilter, hasDashboardFilter);
          },
          (error) => {
            handleError(error);
          }
        );
      })
    );

    return Promise.all(promises).then(() => {
      return sortBy(values(sections), 'score');
    });
  }

  private handleGetReportsResult(
    sections: Sections,
    results: any,
    dashboardsList: any[],
    hasSearchFilter: boolean,
    hasDashboardFilter: boolean
  ): any {
    if (results.length === 0) {
      return sections;
    }

    results.map((item: any) => {
      const dashboardDetails = dashboardsList.find((dash) => dash.id === item.dashboardId);
      if (!dashboardDetails) {
        return;
      }
      const report: ReportSectionItem = {
        checked: false,
        folderId: dashboardDetails.id,
        folderTitle: dashboardDetails.label,
        id: item.id,
        selected: false,
        title: item.name,
        url: 'reports/' + (hasDashboardFilter ? `d/${dashboardDetails.uid}/` : '') + `edit/${item.id}`,
        description: item.description,
        cronExp: item.cron,
        type: ReportSearchItemType.ReportItem,
        enabled: item.enabled,
        info: item.info,
      };
      const section = sections[item.dashboardId];
      if (!section) {
        sections[item.dashboardId] = {
          id: dashboardDetails.id,
          title: dashboardDetails.title,
          expanded: hasSearchFilter,
          items: [],
          url: `reports/d/${dashboardDetails.uid}`,
          icon: 'folder',
          type: ReportSearchItemType.ReportFolder,
        };
      }
      sections[item.dashboardId].items?.push(report);
    });
  }
}

export const reportsSrv = new ReportsSrv();
