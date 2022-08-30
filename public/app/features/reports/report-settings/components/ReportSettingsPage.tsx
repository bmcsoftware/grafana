import { NavModel } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import Page from 'app/core/components/Page/Page';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';
import { connect, MapDispatchToProps } from 'react-redux';
import { ReportSettingDto } from '../types';
import { ReportSettingsForm } from './ReportSettingsForm';
import React, { PureComponent } from 'react';
import { reportsSrv } from 'app/core/services/reports_srv';

interface ConnectedProps {
  navModel: NavModel;
}

interface DispatchProps {}

interface OwnProps {}

type Props = ConnectedProps & DispatchProps;

export interface ReportSettingState {
  isLoading: boolean;
  settings?: ReportSettingDto;
}

export class ReportSettingsPage extends PureComponent<Props, ReportSettingState> {
  state = {
    isLoading: true,
  };
  defaultValues: ReportSettingDto = {
    logoUrl: '',
    footerText: '',
    footerTextUrl: '',
    footerSentBy: false,
    internalDomainsOnly: false,
    whitelistedDomains: [],
  };

  async componentDidMount() {
    await reportsSrv.getReportSettings().then(
      (setting: ReportSettingDto) => {
        this.defaultValues = {
          logoUrl: setting.logoUrl,
          footerText: setting.footerText,
          footerTextUrl: setting.footerTextUrl,
          footerSentBy: setting.footerSentBy || false,
          internalDomainsOnly: setting.internalDomainsOnly,
          whitelistedDomains: setting.whitelistedDomains || [],
        };
      },
      (error) => {}
    );
    this.setState({
      ...this.state,
      isLoading: false,
    });
    return;
  }

  onSubmit = async (data: ReportSettingDto) => {
    await reportsSrv.setReportSettings(data);
  };

  onReset = async () => {
    await reportsSrv.resetReportSettings();
    locationService.push({ pathname: '/reports' });
  };

  render() {
    const { navModel } = this.props;
    return (
      <Page navModel={navModel}>
        <Page.Contents isLoading={this.state.isLoading}>
          <div style={{ width: 600 }}>
            <ReportSettingsForm defaultValues={this.defaultValues} onSubmit={this.onSubmit} onReset={this.onReset} />
          </div>
        </Page.Contents>
      </Page>
    );
  }
}

const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = {};
const mapStateToProps = (state: StoreState) => {
  return {
    navModel: getNavModel(state.navIndex, 'report-branding'),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(ReportSettingsPage);
