import React, { PureComponent, lazy, Suspense } from 'react';

import { Modal, ModalTabsHeader, TabContent } from '@grafana/ui';
import { LoadingChunkPlaceHolder } from 'app/core/components/DynamicImports/LoadingChunkPlaceHolder';
import { config } from 'app/core/config';
import { contextSrv } from 'app/core/core';
import { getGrafanaFeatureStatus, FEATURE_CONST } from 'app/features/dashboard/services/featureFlagSrv';
import { DashboardModel, PanelModel } from 'app/features/dashboard/state';
import { isPanelModelLibraryPanel } from 'app/features/library-panels/guard';

import { ShareEmbed } from './ShareEmbed';
import { ShareExport } from './ShareExport';
import { ShareLibraryPanel } from './ShareLibraryPanel';
import { ShareLink } from './ShareLink';
import { SharePublicDashboard } from './SharePublicDashboard';
import { ShareSnapshot } from './ShareSnapshot';
import { ShareModalTabModel } from './types';

// BMC code
const ExportUtility = lazy(() => import(/* webpackChunkName: "ExportUtility" */ './ExportUtility'));

const renderLoader = () => <LoadingChunkPlaceHolder />;

export class LazyExportUtility extends PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    return (
      <Suspense fallback={renderLoader()}>
        <ExportUtility {...this.props} />
      </Suspense>
    );
  }
}

const downloadTab: ShareModalTabModel[] = [{ label: 'Download', value: 'download', component: LazyExportUtility }];
// End

// prettier-ignore

const customDashboardTabs: ShareModalTabModel[] = [];
const customPanelTabs: ShareModalTabModel[] = [];

export function addDashboardShareTab(tab: ShareModalTabModel) {
  customDashboardTabs.push(tab);
}

export function addPanelShareTab(tab: ShareModalTabModel) {
  customPanelTabs.push(tab);
}

function getInitialState(props: Props): State {
  const tabs = getTabs(props);
  return {
    tabs,
    activeTab: tabs[0].value,
  };
}

function getTabs(props: Props) {
  const { panel } = props;

  const tabs: ShareModalTabModel[] = [{ label: 'Link', value: 'link', component: ShareLink }];

  // BMC code - inline change
  if (contextSrv.isSignedIn && getGrafanaFeatureStatus(FEATURE_CONST.snapshot)) {
    tabs.push({ label: 'Snapshot', value: 'snapshot', component: ShareSnapshot });
  }

  if (panel) {
    tabs.push({ label: 'Embed', value: 'embed', component: ShareEmbed });

    if (!isPanelModelLibraryPanel(panel)) {
      tabs.push({ label: 'Library panel', value: 'library_panel', component: ShareLibraryPanel });
    }
    tabs.push(...customPanelTabs);
    // BMC code
    if (!panel.isEditing) {
      tabs.push(...downloadTab);
    }
    // End
  } else {
    tabs.push({ label: 'Export', value: 'export', component: ShareExport });
    tabs.push(...customDashboardTabs);
    // BMC code - next line
    tabs.push(...downloadTab);
  }

  if (Boolean(config.featureToggles['publicDashboards'])) {
    tabs.push({ label: 'Public Dashboard', value: 'share', component: SharePublicDashboard });
  }

  return tabs;
}

interface Props {
  dashboard: DashboardModel;
  panel?: PanelModel;
  // BMC code - inline change
  onDismiss?(): void;
}

interface State {
  tabs: ShareModalTabModel[];
  activeTab: string;
}

export class ShareModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = getInitialState(props);
  }

  // onDismiss = () => {
  //   //this.setState(getInitialState(this.props));
  //   this.props.onDismiss();
  // };

  onSelectTab = (t: any) => {
    this.setState({ activeTab: t.value });
  };

  getTabs() {
    return getTabs(this.props);
  }

  getActiveTab() {
    const { tabs, activeTab } = this.state;
    return tabs.find((t) => t.value === activeTab)!;
  }

  renderTitle() {
    const { panel } = this.props;
    const { activeTab } = this.state;
    const title = panel ? 'Share Panel' : 'Share';
    const tabs = this.getTabs();

    return (
      <ModalTabsHeader
        title={title}
        icon="share-alt"
        tabs={tabs}
        activeTab={activeTab}
        onChangeTab={this.onSelectTab}
      />
    );
  }

  render() {
    const { dashboard, panel } = this.props;
    const activeTabModel = this.getActiveTab();
    const ActiveTab = activeTabModel.component;

    return (
      <Modal isOpen={true} title={this.renderTitle()} onDismiss={this.props.onDismiss}>
        <TabContent>
          <ActiveTab dashboard={dashboard} panel={panel} onDismiss={this.props.onDismiss} />
        </TabContent>
      </Modal>
    );
  }
}
