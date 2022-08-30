import { NavModel } from '@grafana/data';
import Page from 'app/core/components/Page/Page';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';
import { connect, MapDispatchToProps, MapStateToProps } from 'react-redux';
import React, { PureComponent } from 'react';
import { ReportConsoleFilter } from './ReportConsoleFilter';
import { Job, ReportConsoleList } from './ReportConsoleList';
import { reportsSrv } from 'app/core/services/reports_srv';
import { NoReportJobsSplash } from './lib/NoReportJobsSplash';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { debounce } from 'lodash';

interface ConnectedProps {
  navModel: NavModel;
  folderUid?: string;
  query?: string;
}

interface DispatchProps {}

interface OwnProps {}

type Props = ConnectedProps & DispatchProps;

export interface State {
  isLoading: boolean;
  jobs: Job[];
}

export class ReportConsolePage extends PureComponent<Props, State> {
  state = {
    isLoading: true,
    jobs: [],
  };

  async componentDidMount() {
    await this.onQueryChange(this.props.query);
  }

  onQueryChange = debounce(async (query?: string) => {
    try {
      const jobs = await reportsSrv.getReportsQueue(query);
      this.setState({ ...this.state, jobs });
    } finally {
      this.setState({ ...this.state, isLoading: false });
    }
  }, 600);

  render() {
    const showNewReportSplash = this.state.jobs.length === 0;
    const { navModel } = this.props;
    const { isLoading } = this.state;
    return (
      <Page navModel={navModel}>
        <Page.Contents isLoading={isLoading}>
          <ReportConsoleFilter isFolder={!!this.props.folderUid} onSearch={this.onQueryChange} />
          {showNewReportSplash ? (
            <NoReportJobsSplash />
          ) : (
            <div>
              <ReportConsoleList
                update={async () => {
                  const jobs = await reportsSrv.getReportsQueue(this.props.query);
                  this.setState({ ...this.state, jobs });
                  this.forceUpdate();
                }}
                folderUid={this.props.folderUid}
                jobs={this.state.jobs}
              />
            </div>
          )}
        </Page.Contents>
      </Page>
    );
  }
}
interface ReportProps extends GrafanaRouteComponentProps<{ folderUid?: string; query?: string }> {}
const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = {};
const mapStateToProps: MapStateToProps<ConnectedProps, ReportProps, StoreState> = (state: StoreState, props) => {
  return {
    navModel: getNavModel(state.navIndex, 'report-history'),
    query: props.queryParams?.['query']?.toString(),
    folderUid: props.match.params.folderUid,
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(ReportConsolePage);
