import React, { FC, ReactNode, useContext, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { AppEvents, locationUtil, textUtil } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors/src';
import { locationService } from '@grafana/runtime';
import {
  ButtonGroup,
  ModalsController,
  ToolbarButton,
  PageToolbar,
  useForceUpdate,
  Tag,
  ToolbarButtonRow,
  ModalsContext,
  Tooltip,
  ButtonSelect,
} from '@grafana/ui';
import { AppChromeUpdate } from 'app/core/components/AppChrome/AppChromeUpdate';
import { NavToolbarSeparator } from 'app/core/components/AppChrome/NavToolbarSeparator';
import { config } from 'app/core/config';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { appEvents } from 'app/core/core';
import { useBusEvent } from 'app/core/hooks/useBusEvent';
import { t, Trans } from 'app/core/internationalization';
import { DashboardCommentsModal } from 'app/features/dashboard/components/DashboardComments/DashboardCommentsModal';
import { SaveDashboardDrawer } from 'app/features/dashboard/components/SaveDashboard/SaveDashboardDrawer';
import { ShareModal } from 'app/features/dashboard/components/ShareModal';
import { playlistSrv } from 'app/features/playlist/PlaylistSrv';
import { updateTimeZoneForSession } from 'app/features/profile/state/reducers';
import { KioskMode } from 'app/types';
import { DashboardMetaChangedEvent } from 'app/types/events';

import { setStarred } from '../../../../core/reducers/navBarTree';
import { getDashboardSrv } from '../../services/DashboardSrv';
import { DashboardModel } from '../../state';

import { DashNavButton } from './DashNavButton';
import { DashNavTimeControls } from './DashNavTimeControls';

const mapDispatchToProps = {
  setStarred,
  updateTimeZoneForSession,
};

const connector = connect(null, mapDispatchToProps);

const selectors = e2eSelectors.pages.Dashboard.DashNav;

export interface OwnProps {
  dashboard: DashboardModel;
  isFullscreen: boolean;
  kioskMode?: KioskMode | null;
  hideTimePicker: boolean;
  folderTitle?: string;
  title: string;
  shareModalActiveTab?: string;
  onAddPanel: () => void;
}

interface DashNavButtonModel {
  show: (props: Props) => boolean;
  component: FC<Partial<Props>>;
  index?: number | 'end';
}

const customLeftActions: DashNavButtonModel[] = [];
const customRightActions: DashNavButtonModel[] = [];

export function addCustomLeftAction(content: DashNavButtonModel) {
  customLeftActions.push(content);
}

export function addCustomRightAction(content: DashNavButtonModel) {
  customRightActions.push(content);
}

type Props = OwnProps & ConnectedProps<typeof connector>;

export const DashNav = React.memo<Props>((props) => {
  const forceUpdate = useForceUpdate();
  const { chrome } = useGrafana();
  const { showModal, hideModal } = useContext(ModalsContext);

  // We don't really care about the event payload here only that it triggeres a re-render of this component
  useBusEvent(props.dashboard.events, DashboardMetaChangedEvent);

  const onStarDashboard = () => {
    const dashboardSrv = getDashboardSrv();
    const { dashboard, setStarred } = props;

    dashboardSrv.starDashboard(dashboard.id, Boolean(dashboard.meta.isStarred)).then((newState) => {
      setStarred({ id: dashboard.uid, title: dashboard.title, url: dashboard.meta.url ?? '', isStarred: newState });
      dashboard.meta.isStarred = newState;
      forceUpdate();
    });
  };

  const onClose = () => {
    locationService.partial({ viewPanel: null });
  };

  const onToggleTVMode = () => {
    chrome.onToggleKioskMode();
  };

  const onOpenSettings = () => {
    locationService.partial({ editview: 'settings' });
  };

  const onPlaylistPrev = () => {
    playlistSrv.prev();
  };

  const onPlaylistNext = () => {
    playlistSrv.next();
  };

  const onPlaylistStop = () => {
    playlistSrv.stop();
    forceUpdate();
  };

  const addCustomContent = (actions: DashNavButtonModel[], buttons: ReactNode[]) => {
    actions.map((action, index) => {
      const Component = action.component;
      const element = <Component {...props} key={`button-custom-${index}`} />;
      typeof action.index === 'number' ? buttons.splice(action.index, 0, element) : buttons.push(element);
    });
  };

  const isPlaylistRunning = () => {
    return playlistSrv.isPlaying;
  };

  // Open/Close
  useEffect(() => {
    const dashboard = props.dashboard;
    const shareModalActiveTab = props.shareModalActiveTab;
    const { canShare } = dashboard.meta;

    if (canShare && shareModalActiveTab) {
      // automagically open modal
      showModal(ShareModal, {
        dashboard,
        onDismiss: hideModal,
        activeTab: shareModalActiveTab,
      });
    }
    return () => {
      hideModal();
    };
  }, [showModal, hideModal, props.dashboard, props.shareModalActiveTab]);

  const renderLeftActions = () => {
    const { dashboard, kioskMode } = props;
    const { canStar, canShare, isStarred } = dashboard.meta;
    const buttons: ReactNode[] = [];

    if (kioskMode || isPlaylistRunning()) {
      return [];
    }

    if (canStar) {
      let desc = isStarred
        ? t('dashboard.toolbar.unmark-favorite', 'Unmark as favorite')
        : t('dashboard.toolbar.mark-favorite', 'Mark as favorite');
      buttons.push(
        <DashNavButton
          tooltip={desc}
          icon={isStarred ? 'favorite' : 'star'}
          iconType={isStarred ? 'mono' : 'default'}
          iconSize="lg"
          onClick={onStarDashboard}
          key="button-star"
        />
      );
    }

    if (canShare) {
      buttons.push(
        <ModalsController key="button-share">
          {({ showModal, hideModal }) => (
            <DashNavButton
              tooltip={t('dashboard.toolbar.share', 'Share dashboard or panel')}
              icon="share-alt"
              iconSize="lg"
              onClick={() => {
                showModal(ShareModal, {
                  dashboard,
                  onDismiss: hideModal,
                });
              }}
            />
          )}
        </ModalsController>
      );
    }

    if (dashboard.meta.publicDashboardEnabled) {
      buttons.push(
        <Tag key="public-dashboard" name="Public" colorIndex={5} data-testid={selectors.publicDashboardTag}></Tag>
      );
    }

    if (dashboard.uid && config.featureToggles.dashboardComments) {
      buttons.push(
        <ModalsController key="button-dashboard-comments">
          {({ showModal, hideModal }) => (
            <DashNavButton
              tooltip={t('dashboard.toolbar.comments-show', 'Show dashboard comments')}
              icon="comment-alt-message"
              iconSize="lg"
              onClick={() => {
                showModal(DashboardCommentsModal, {
                  dashboard,
                  onDismiss: hideModal,
                });
              }}
            />
          )}
        </ModalsController>
      );
    }

    // BMC code
    if (canShare) {
      const { theme } = config;
      buttons.push(
        <div key="button-reports" style={{ display: 'flex' }}>
          <Tooltip content="Manage scheduled reports">
            <div
              onClick={() => {
                sessionStorage.removeItem('reportFilter');
                locationService.push({
                  search: locationService.getSearch().toString(),
                  pathname: `/a/reports/f/${dashboard.uid}`,
                });
              }}
            >
              <img
                alt=""
                style={{
                  width: '22px',
                  filter: theme.isDark ? 'brightness(1.2)' : 'brightness(0.5)',
                }}
                src="public/img/icon_scheduler.svg"
              />
            </div>
          </Tooltip>
        </div>
      );
    }
    // End
    addCustomContent(customLeftActions, buttons);
    return buttons;
  };

  const renderPlaylistControls = () => {
    return (
      <ButtonGroup key="playlist-buttons">
        <ToolbarButton
          tooltip={t('dashboard.toolbar.playlist-previous', 'Go to previous dashboard')}
          icon="backward"
          onClick={onPlaylistPrev}
          narrow
        />
        <ToolbarButton onClick={onPlaylistStop}>
          <Trans i18nKey="dashboard.toolbar.playlist-stop">Stop playlist</Trans>
        </ToolbarButton>
        <ToolbarButton
          tooltip={t('dashboard.toolbar.playlist-next', 'Go to next dashboard')}
          icon="forward"
          onClick={onPlaylistNext}
          narrow
        />
      </ButtonGroup>
    );
  };

  const renderTimeControls = () => {
    const { dashboard, updateTimeZoneForSession, hideTimePicker } = props;

    if (hideTimePicker) {
      return null;
    }

    return (
      <DashNavTimeControls dashboard={dashboard} onChangeTimeZone={updateTimeZoneForSession} key="time-controls" />
    );
  };

  // BMC code - name change to start with capital letter
  const RenderRightActions = () => {
    const { dashboard, onAddPanel, isFullscreen, kioskMode } = props;
    const { canSave, canEdit, showSettings } = dashboard.meta;
    const { snapshot } = dashboard;
    const snapshotUrl = snapshot && snapshot.originalUrl;
    const buttons: ReactNode[] = [];
    // BMC code - for dashboard personalization
    const [isLoadingPersonalization, setIsLoadingPersonalization] = React.useState(false);
    const onSaveFilters = () => {
      setIsLoadingPersonalization(true);
      const dashboardSrv = getDashboardSrv();
      const currentVariableValues = dashboard.getVariables();
      const currentTimeRangeValues = dashboard.time;
      dashboardSrv
        .savePersonalizedFilters({
          uid: dashboard.uid,
          list: currentVariableValues ?? [],
          time: currentTimeRangeValues,
        })
        .then(() => {
          appEvents.emit(AppEvents.alertSuccess, ['Saved filter values successfully.']);
        })
        .catch((err) => {
          appEvents.emit(AppEvents.alertError, ['Failed to save filter values.']);
        })
        .finally(() => {
          setIsLoadingPersonalization(false);
        });
    };

    const onResetFilters = () => {
      setIsLoadingPersonalization(true);
      const dashboardSrv = getDashboardSrv();
      dashboardSrv
        .resetPersonalizedFilters(dashboard.uid)
        .then(() => {
          // BMC code - reload the dashboard to reset the variables
          window.location.href = window.location.href.split("?")[0];
        })
        .catch((err) => {
          appEvents.emit(AppEvents.alertError, ['Failed to reset filter values.']);
        })
        .finally(() => {
          setIsLoadingPersonalization(false);
        });
    };
    // BMC code - end

    const tvButton = config.featureToggles.topnav ? null : (
      <ToolbarButton
        tooltip={t('dashboard.toolbar.tv-button', 'Cycle view mode')}
        icon="monitor"
        onClick={onToggleTVMode}
        key="tv-button"
      />
    );

    if (isPlaylistRunning()) {
      return [renderPlaylistControls(), renderTimeControls()];
    }

    if (kioskMode === KioskMode.TV) {
      return [renderTimeControls(), tvButton];
    }

    if (canEdit && !isFullscreen) {
      buttons.push(
        <ToolbarButton
          tooltip={t('dashboard.toolbar.add-panel', 'Add panel')}
          icon="panel-add"
          onClick={onAddPanel}
          key="button-panel-add"
        />
      );
    }

    if (canSave && !isFullscreen) {
      buttons.push(
        <ModalsController key="button-save">
          {({ showModal, hideModal }) => (
            <ToolbarButton
              tooltip={t('dashboard.toolbar.save', 'Save dashboard')}
              icon="save"
              onClick={() => {
                showModal(SaveDashboardDrawer, {
                  dashboard,
                  onDismiss: hideModal,
                });
              }}
            />
          )}
        </ModalsController>
      );
    }

    // BMC code - for dashboard personalization
    // Checking UID to hide save filters on Home dash
    if (dashboard.uid && !isFullscreen) {
      buttons.push(
        <ButtonGroup>
          <ToolbarButton
            icon={isLoadingPersonalization ? 'fa fa-spinner' : 'bmc-save-filter'}
            tooltip={t('dashboard.toolbar.save-filters', 'Save filters')}
            disabled={!(dashboard.hasVariableValuesChanged() || dashboard.hasTimeChanged())}
            onClick={onSaveFilters}
            key="button-save-adfiltersd"
          />
          <ButtonSelect
            value={undefined}
            options={[{ label: 'Reset filters', value: 'Reset filters' }]}
            title={t('dashboard.toolbar.reset-filters', 'Reset filters')}
            onChange={onResetFilters}
          />
        </ButtonGroup>
      );
    }
    // End

    if (snapshotUrl) {
      buttons.push(
        <ToolbarButton
          tooltip={t('dashboard.toolbar.open-original', 'Open original dashboard')}
          onClick={() => gotoSnapshotOrigin(snapshotUrl)}
          icon="link"
          key="button-snapshot"
        />
      );
    }

    if (showSettings) {
      buttons.push(
        <ToolbarButton
          tooltip={t('dashboard.toolbar.settings', 'Dashboard settings')}
          icon="cog"
          onClick={onOpenSettings}
          key="button-settings"
        />
      );
    }

    addCustomContent(customRightActions, buttons);

    buttons.push(renderTimeControls());
    buttons.push(tvButton);
    return buttons;
  };

  const gotoSnapshotOrigin = (snapshotUrl: string) => {
    window.location.href = textUtil.sanitizeUrl(snapshotUrl);
  };

  const { isFullscreen, title, folderTitle } = props;
  // this ensures the component rerenders when the location changes
  const location = useLocation();
  const titleHref = locationUtil.getUrlForPartial(location, { search: 'open' });
  const parentHref = locationUtil.getUrlForPartial(location, { search: 'open', query: 'folder:current' });
  const onGoBack = isFullscreen ? onClose : undefined;

  if (config.featureToggles.topnav) {
    return (
      <AppChromeUpdate
        actions={
          <>
            {renderLeftActions()}
            <NavToolbarSeparator leftActionsSeparator />
            <ToolbarButtonRow alignment="right">{RenderRightActions()}</ToolbarButtonRow>
          </>
        }
      />
    );
  }

  return (
    <PageToolbar
      pageIcon={isFullscreen ? undefined : 'apps'}
      title={title}
      parent={folderTitle}
      titleHref={titleHref}
      parentHref={parentHref}
      onGoBack={onGoBack}
      leftItems={renderLeftActions()}
    >
      {RenderRightActions()}
    </PageToolbar>
  );
});

DashNav.displayName = 'DashNav';

export default connector(DashNav);
