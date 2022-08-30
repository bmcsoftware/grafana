import { AppEvents, DataSourceInstanceSettings } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { appEvents } from '../core';
import { getBackendSrv, backendSrv } from './backend_srv';

export class CalcFieldsSrv {
  request(url: string, method: string, data?: any) {
    const options = {
      url,
      method,
      data,
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        Authorization: 'IMS-JWT ',
        'X-Requested-By': undefined,
      },
    };
    return getBackendSrv().fetch(options);
  }

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

  handleError(error: any) {
    const message = error.data?.message ? error.data.message : error.message ?? 'Unknown failure';
    appEvents.emit(AppEvents.alertError, [message]);
    throw error;
  }

  getDatasourceInstanceUrl = async () => {
    const bmcHelixDS = getDataSourceSrv()
      .getList()
      .find((dataSource: DataSourceInstanceSettings) => {
        return dataSource.type === 'bmchelix-ade-datasource';
      });
    return (bmcHelixDS?.jsonData as any)?.platformURL ? `/api/datasources/proxy/${bmcHelixDS?.id}` : '';
  };

  getFields = async (datasourceInstanceUrl?: string) => {
    let dsInstanceUrl = datasourceInstanceUrl;
    if (!datasourceInstanceUrl) {
      dsInstanceUrl = await this.getDatasourceInstanceUrl();
    }
    if (!dsInstanceUrl) {
      return { err: 'Connectivity to BMC Helix ITSM is not configured.' };
    }
    return getBackendSrv()
      .get('api/org/calculatedfield')
      .then((results) => {
        return { results, dsInstanceUrl };
      });
  };

  getForms = (datasourceInstanceUrl?: string) => {
    return lastValueFrom(this.request(datasourceInstanceUrl + '/api/arsys/v1.0/form', 'GET'));
  };

  getFieldById = (id: string | number) => {
    return getBackendSrv().get(`api/org/calculatedfield?id=${id}`);
  };

  getColumns = (dsInstanceUrl: string, formName: string) => {
    return lastValueFrom(
      this.request(
        dsInstanceUrl + `/api/arsys/v1.0/fields/${formName}?field_criteria=NAME,DATATYPE,OPTIONS&field_type=DATA`,
        'GET'
      )
    );
  };

  validateRawQuery = (dsInstanceUrl: string, query: string) => {
    const reqBody = {
      date_format: 'DD/MM/YYYY',
      sql: query,
      output_type: 'Table',
    };
    return lastValueFrom(this.request(dsInstanceUrl + '/api/arsys/v1.0/report/arsqlquery', 'POST', reqBody));
  };

  deleteFields = (fields: number[]) => {
    return lastValueFrom(this.request('api/org/calculatedfield', 'DELETE', { ids: fields }));
  };

  createField = (field: any) => {
    return getBackendSrv().post('api/org/calculatedfield', field);
  };

  updateField = (field: any) => {
    return getBackendSrv().put('api/org/calculatedfield', field);
  };
}

export const calcFieldsSrv = new CalcFieldsSrv();
