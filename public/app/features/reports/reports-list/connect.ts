import React from 'react';
import { MapDispatchToProps, MapStateToProps } from 'react-redux';
import { connectWithStore } from 'app/core/utils/connectWithReduxStore';
import { StoreState } from 'app/types';
import { parseRouteParams } from './utils';
import { ReportQuery } from './types';
import { Props as ManageReportProps } from './components/ManageReports';
import { locationService } from '../../../../../packages/grafana-runtime/src';

export interface ConnectProps {
  params: Partial<ReportQuery>;
}

export interface DispatchProps {
  updateLocation: typeof locationService.replace;
}

type Props = ManageReportProps;

const mapStateToProps: MapStateToProps<ConnectProps, Props, StoreState> = (state) => {
  const { query, sort, layout, folder } = locationService.getSearchObject();
  return parseRouteParams(
    {
      query,
      sort,
      layout,
    },
    folder
  );
};

const mapDispatchToProps: MapDispatchToProps<DispatchProps, Props> = {
  updateLocation: locationService.replace,
};

export const connectWithRouteParams = (Component: React.FC) =>
  connectWithStore(Component, mapStateToProps, mapDispatchToProps);
