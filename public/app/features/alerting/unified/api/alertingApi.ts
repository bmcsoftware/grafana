import { BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';

import { BackendSrvRequest } from '@grafana/runtime';

export const backendSrvBaseQuery = (): BaseQueryFn<BackendSrvRequest> => async (requestOptions) => {
  try {
    // BMC Change: Disable the alerting api call
    console.warn('Suppressed alert api call');
    // const requestStartTs = performance.now();

    // const { data, ...meta } = await lastValueFrom(getBackendSrv().fetch(requestOptions));

    // logInfo('Request finished', {
    //   loadTimeMs: (performance.now() - requestStartTs).toFixed(0),
    //   url: requestOptions.url,
    //   method: requestOptions.method ?? '',
    //   responseStatus: meta.statusText,
    // });
    // Mock response
    return { data: { status: 'success', data: { groups: [] } }, meta: undefined };
    // BMC Change: Ends
  } catch (error) {
    return { error };
  }
};

export const alertingApi = createApi({
  reducerPath: 'alertingApi',
  baseQuery: backendSrvBaseQuery(),
  tagTypes: [
    'AlertmanagerChoice',
    'AlertmanagerConfiguration',
    'OnCallIntegrations',
    'OrgMigrationState',
    'DataSourceSettings',
  ],
  endpoints: () => ({}),
});
