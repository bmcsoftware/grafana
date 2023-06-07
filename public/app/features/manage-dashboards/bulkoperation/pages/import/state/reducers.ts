import { Action } from 'redux';

import { DataSourceInstanceSettings } from '@grafana/data';
import {
  DashboardSource,
  ImportDashboardDTO,
  InputType,
  LibraryPanelInputState,
  DashboardInput,
  DataSourceInput,
  LibraryPanelInput,
  DashboardInputs,
} from 'app/features/manage-dashboards/state/reducers';

import {
  SET_DASHBOARD_INPUTS_BY_ID,
  SET_JSON_DASHBOARD,
  CLEAR_DASHBOARD_BY_ID,
  UPDATE_DASHBOARD,
  CLEAR_ALL_DASHBOARD,
} from '../actions';

interface ActionImpl extends Action {
  payload?: any;
}

interface ImportDashboardState {
  meta: { updatedAt: string; orgName: string };
  dashboard: any;
  source: DashboardSource;
  inputs?: DashboardInputs;
  dashId?: string;
  inputsToPersist?: any;
  folderId?: any;
  checked?: boolean;
}

interface ImportDashboardsState {
  dashboards: { [key: string]: ImportDashboardState };
}

const initialImportDashboardState: ImportDashboardsState = {
  dashboards: {},
};

const importReducer = (state: ImportDashboardsState, action: ActionImpl) => {
  switch (action.type) {
    case CLEAR_ALL_DASHBOARD: {
      return {
        dashboards: {},
      };
    }
    case SET_JSON_DASHBOARD: {
      const newState = { ...state };
      if (!newState.dashboards[action.payload.dashId]) {
        newState.dashboards[action.payload.dashId] = {
          dashboard: { ...action.payload.dashboard, id: null },
          meta: { updatedAt: '', orgName: '' },
          source: DashboardSource.Json,
          dashId: action.payload.dashId,
        };
      } else {
        newState.dashboards[action.payload.dashId] = {
          ...newState.dashboards[action.payload.dashId],
          dashboard: { ...action.payload.dashboard, id: null },
          meta: { updatedAt: '', orgName: '' },
          source: DashboardSource.Json,
        };
      }
      return { ...newState };
    }
    case CLEAR_DASHBOARD_BY_ID: {
      const newState = { ...state };
      if (newState.dashboards[action.payload.dashId]) {
        delete newState.dashboards[action.payload.dashId];
      }
      return { ...newState };
    }
    case SET_DASHBOARD_INPUTS_BY_ID: {
      const newState = { ...state };
      if (newState.dashboards[action.payload.dashId]) {
        newState.dashboards[action.payload.dashId] = {
          ...newState.dashboards[action.payload.dashId],
          inputs: {
            dataSources: action.payload.inputs.filter((p: any) => p.type === InputType.DataSource),
            constants: action.payload.inputs.filter((p: any) => p.type === InputType.Constant),
            libraryPanels: action.payload.libraryPanelInputs,
          },
        };
      }
      return { ...newState };
    }
    case UPDATE_DASHBOARD: {
      const newState = { ...state };
      if (newState.dashboards[action.payload.dashId]) {
        const dashInfo = newState.dashboards[action.payload.dashId];
        const dashboard = dashInfo.dashboard;
        const inputs = dashInfo.inputs;
        let inputsToPersist = [] as any[];
        action.payload.updatedDashboard.dataSources?.forEach(
          (dataSource: DataSourceInstanceSettings, index: number) => {
            const input = inputs?.dataSources[index];
            inputsToPersist.push({
              name: input?.name,
              type: input?.type,
              pluginId: input?.pluginId,
              value: dataSource?.uid,
            });
          }
        );

        action.payload.updatedDashboard.constants?.forEach((constant: any, index: number) => {
          const input = inputs?.constants[index];

          inputsToPersist.push({
            value: constant,
            name: input?.name,
            type: input?.type,
          });
        });
        newState.dashboards[action.payload.dashId] = {
          ...dashInfo,
          dashboard: {
            ...dashboard,
            title: action.payload.updatedDashboard.title,
            uid: action.payload.updatedDashboard.uid || dashboard.uid,
          },
          inputsToPersist,
          folderId: action.payload.updatedDashboard.folder.id,
          checked: true,
        };
      }
      return { ...newState };
    }
    default: {
      return { ...state };
    }
  }
};

export {
  DashboardSource,
  ImportDashboardDTO,
  InputType,
  LibraryPanelInputState,
  DashboardInput,
  DataSourceInput,
  LibraryPanelInput,
  DashboardInputs,
  ActionImpl,
  ImportDashboardState,
  ImportDashboardsState,
  initialImportDashboardState,
  importReducer,
};
