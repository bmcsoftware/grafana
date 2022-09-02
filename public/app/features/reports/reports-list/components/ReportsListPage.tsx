import { NavModel } from '@grafana/data';
import Page from 'app/core/components/Page/Page';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';
import React, { FC, memo } from 'react';
import { connect, MapStateToProps } from 'react-redux';
import { useAsync } from 'react-use';
import ManageReports from './ManageReports';
import { backendSrv } from 'app/core/services/backend_srv';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';

interface ConnectedProps {
  navModel: NavModel;
  uid?: string;
  url: string;
}

export const ReportsListPage: FC<ConnectedProps> = memo(({ navModel, uid, url }) => {
  const { loading, value } = useAsync(async () => {
    if (!uid || !url.startsWith('/reports')) {
      return Promise.resolve({ pageNavModel: navModel, dashboard: undefined });
    }

    const { dashboard, model } = await loadDashboard(uid, navModel);
    return { dashboard, pageNavModel: model };
  }, [uid]);

  return (
    <Page navModel={value?.pageNavModel ?? navModel}>
      <Page.Contents isLoading={loading}>
        <ManageReports dashboard={value?.dashboard} />
      </Page.Contents>
    </Page>
  );
});
ReportsListPage.displayName = 'ReportsListPage';

interface ReportProps extends GrafanaRouteComponentProps<{ uid?: string }> {}

const mapStateToProps: MapStateToProps<ConnectedProps, ReportProps, StoreState> = (state, props) => {
  return {
    navModel: getNavModel(state.navIndex, 'manage-reports'),
    url: props.match.url,
    uid: props.match.params.uid,
  };
};

export default connect(mapStateToProps)(ReportsListPage);

export const loadDashboard = (uid: string, navModel: NavModel) => {
  return backendSrv.getDashboardByUid(uid).then((folder) => {
    const title = folder.dashboard.title;
    navModel.main.text = `Scheduled Reports for ${title}`;

    return { dashboard: folder.dashboard, model: navModel };
  });
};
