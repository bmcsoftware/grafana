import { AppEvents } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { appEvents } from 'app/core/core';
import { backendSrv } from 'app/core/services/backend_srv';
import { buildHostUrl } from 'app/features/dashboard/components/ShareModal/utils';
import { ThunkResult } from 'app/types';
import { ReportDTO, ReportFilterItem } from '../types';
import { reportTypeOptions } from '../utils';
import { dashboardFilterLoaded, dashboardsLoaded, usersLoaded } from './reducers';

export function createReport(data: ReportDTO): ThunkResult<void> {
  return async (dispatch) => {
    await backendSrv.post('/api/reports/create', data);
    locationService.push({ pathname: '/reports' });
  };
}

export function updateReport(data: ReportDTO): ThunkResult<void> {
  return async (dispatch) => {
    await backendSrv.put('/api/reports/update', data);
    locationService.push({ pathname: '/reports' });
  };
}

export function testReport(data: ReportDTO, callback: () => void): ThunkResult<void> {
  return async (dispatch) => {
    try {
      handleSuccess('Sending Report in progress...');
      const res = await fetch(`${buildHostUrl()}/api/reports/mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.status === 503) {
        const message = 'Report generation in progress...';
        handleSuccess(message);
        return;
      }

      const result = await res.json();
      if (res.status === 500) {
        handleError({ data: result }, 'Execution failed');
        return;
      }

      if (res.status === 200) {
        handleSuccess(result.message);
        return;
      }
    } catch (error) {
      handleError(error, 'Execution failed');
    } finally {
      callback();
    }
  };
}

export function previewReport(data: ReportDTO, callback: () => void): ThunkResult<void> {
  return async (dispatch) => {
    try {
      const res = await fetch(`${buildHostUrl()}/api/reports/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.status !== 200) {
        const data = await res.json();
        handleError({ data }, 'Execution failed');
        return;
      }

      handleSuccess('Report generated successfully');

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      // Can open in new tab unstead of downloading if we set target to _blank
      // and remove the attribute `download`
      // link.target = '_blank';
      link.setAttribute('download', `${data.name} Preview.pdf`);
      link.click();
    } catch (error) {
      handleError(error, 'Execution failed');
    } finally {
      callback();
    }
  };
}

export function loadDashboards(): ThunkResult<void> {
  return async (dispatch) => {
    const response = await backendSrv.search({ type: 'dash-db', limit: 5000 });
    dispatch(dashboardsLoaded(response));
  };
}

export function loadDashboardFilters(
  uid: string,
  callback: (filters: any, reportTypes: any) => void
): ThunkResult<void> {
  return async (dispatch) => {
    if (uid && uid !== '') {
      const response = await backendSrv.getDashboardByUid(uid || '');
      dispatch(dashboardFilterLoaded(response));
      callback(getFilters(response.dashboard), getAvailableReportTypes(response.dashboard));
    } else {
      return;
    }
  };
}

export function loadUsers(query?: string): ThunkResult<void> {
  return async (dispatch) => {
    /*
      getUsers retrieves all system users using Grafana built in API to get org users. THis API is
      guarded with permissions where only Admin users can use it, otherwise, if the user is not with
      Admin role then there is an error fired.

      TODO: depends on RBAC requirements, if users with no Admin role can create a Report, then this API 
      should be replaced by a custom API that any user with any role can access.
    */
    const url = `/api/reports/tenant/users?query=${query || ''}`;
    const response = await backendSrv.get(url);
    dispatch(usersLoaded(response));
  };
}

const handleSuccess = (message: string) => {
  appEvents.emit(AppEvents.alertSuccess, [message]);
};

const handleError = (error: any, defaultMessage: string) => {
  let message = defaultMessage;

  if (error && error.data) {
    if (error.data.message) {
      message = error.data.message;
    }
  }
  message = message.charAt(0).toUpperCase() + message.slice(1);
  appEvents.emit(AppEvents.alertError, [message]);
};

// TODO: Not best place to put this, must add to reducers
const getFilters = (dashboard: any) => {
  const dashboardFiltersList: ReportFilterItem[] = dashboard.templating.list.map((template: any) => {
    const filter: ReportFilterItem = {
      label: template.label,
      value: `var-${template.name}`,
    };
    return filter;
  });
  return dashboardFiltersList;
};

const getAvailableReportTypes = (dashboard: any) => {
  // Get the list of supported reports from dashboard variables
  const reportOptionsVar = dashboard.templating.list.filter((v: any) => v.name === 'supported_report_types');
  if (reportOptionsVar.length !== 0) {
    const rawOptions: string = (reportOptionsVar[0] as any).query;
    const options: string[] = rawOptions.toLocaleLowerCase().split(',');
    if (options.length === 0) {
      return reportTypeOptions;
    }
    const availableOptions = reportTypeOptions.filter((opt) => options.includes(opt.value));
    return availableOptions;
  }
  return reportTypeOptions;
};
