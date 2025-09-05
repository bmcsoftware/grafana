import { css, cx } from '@emotion/css';
import { createPortal } from 'react-dom';

import { GrafanaTheme2, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneTimePicker,
  SceneRefreshPicker,
  SceneDebugger,
  VariableDependencyConfig,
  sceneGraph,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  CancelActivationHandler,
} from '@grafana/scenes';
import { Box, Stack, useStyles2 } from '@grafana/ui';
import { Breadcrumbs } from 'app/core/components/Breadcrumbs/Breadcrumbs';
import { buildBreadcrumbs } from 'app/core/components/Breadcrumbs/utils';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { HOME_NAV_ID } from 'app/core/reducers/navModel';
import { useSelector } from 'app/types/store';

import { PanelEditControls } from '../panel-edit/PanelEditControls';
import { getDashboardSceneFor } from '../utils/utils';

import { DashboardLinksControls } from './DashboardLinksControls';
import { DashboardScene } from './DashboardScene';
import { VariableControls } from './VariableControls';

export interface DashboardControlsState extends SceneObjectState {
  timePicker: SceneTimePicker;
  refreshPicker: SceneRefreshPicker;
  hideTimeControls?: boolean;
  hideVariableControls?: boolean;
  hideLinksControls?: boolean;
}

export class DashboardControls extends SceneObjectBase<DashboardControlsState> {
  static Component = DashboardControlsRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    onAnyVariableChanged: this._onAnyVariableChanged.bind(this),
  });

  protected _urlSync = new SceneObjectUrlSyncConfig(this, {
    keys: ['_dash.hideTimePicker', '_dash.hideVariables', '_dash.hideLinks'],
  });

  /**
   * We want the hideXX url keys to only sync one way (url => state) on init
   * We don't want these flags to be added to URL.
   */
  getUrlState() {
    return {};
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const { hideTimeControls, hideVariableControls, hideLinksControls } = this.state;
    const isEnabledViaUrl = (key: string) => values[key] === 'true' || values[key] === '';

    // Only allow hiding, never "unhiding" from url
    // Because this should really only change on first init it's fine to do multiple setState here

    if (!hideTimeControls && isEnabledViaUrl('_dash.hideTimePicker')) {
      this.setState({ hideTimeControls: true });
    }

    if (!hideVariableControls && isEnabledViaUrl('_dash.hideVariables')) {
      this.setState({ hideVariableControls: true });
    }

    if (!hideLinksControls && isEnabledViaUrl('_dash.hideLinks')) {
      this.setState({ hideLinksControls: true });
    }
  }

  public constructor(state: Partial<DashboardControlsState>) {
    super({
      timePicker: state.timePicker ?? new SceneTimePicker({}),
      refreshPicker: state.refreshPicker ?? new SceneRefreshPicker({}),
      ...state,
    });

    this.addActivationHandler(() => {
      let refreshPickerDeactivation: CancelActivationHandler | undefined;

      if (this.state.hideTimeControls) {
        refreshPickerDeactivation = this.state.refreshPicker.activate();
      }

      return () => {
        if (refreshPickerDeactivation) {
          refreshPickerDeactivation();
        }
      };
    });
  }

  /**
   * Links can include all variables so we need to re-render when any change
   */
  private _onAnyVariableChanged(): void {
    const dashboard = getDashboardSceneFor(this);
    if (dashboard.state.links?.length > 0) {
      this.forceRender();
    }
  }

  public hasControls(): boolean {
    const hasVariables = sceneGraph
      .getVariables(this)
      ?.state.variables.some((v) => v.state.hide !== VariableHide.hideVariable);
    const hasAnnotations = sceneGraph.getDataLayers(this).some((d) => d.state.isEnabled && !d.state.isHidden);
    const hasLinks = getDashboardSceneFor(this).state.links?.length > 0;
    const hideLinks = this.state.hideLinksControls || !hasLinks;
    const hideVariables = this.state.hideVariableControls || (!hasAnnotations && !hasVariables);
    const hideTimePicker = this.state.hideTimeControls;

    return !(hideVariables && hideLinks && hideTimePicker);
  }

  public hideVariables(): boolean {
      const hasVariables = sceneGraph
      .getVariables(this)
      ?.state.variables.some((v) => v.state.hide !== VariableHide.hideVariable);
      const hasAnnotations = sceneGraph.getDataLayers(this).some((d) => d.state.isEnabled && !d.state.isHidden);
      const hideVariables = this.state.hideVariableControls || (!hasAnnotations && !hasVariables);
  
      return hideVariables;
  }
}


function DashboardControlsRenderer({ model }: SceneComponentProps<DashboardControls>) {
  const { refreshPicker, timePicker, hideTimeControls, hideVariableControls, hideLinksControls } = model.useState();
  const dashboard = getDashboardSceneFor(model);
  const { links, editPanel } = dashboard.useState();
  const styles = useStyles2(getStyles);
  const showDebugger = window.location.search.includes('scene-debugger');

  const { chrome } = useGrafana();
  const state = chrome.useState();
  const homeNav = useSelector((state) => state.navIndex)[HOME_NAV_ID];

  const sectionNav=state.sectionNav.node;
  const pageNav=state.pageNav;
  let breadcrumbs = buildBreadcrumbs(sectionNav, pageNav, homeNav);
  breadcrumbs = breadcrumbs.slice(Math.max(breadcrumbs.length - 2, 0));
  breadcrumbs = breadcrumbs.filter(
    (each) =>
      each.text.toLowerCase() === 'view panel' ||
      each.text.toLowerCase().startsWith('playback ') ||
      each.text.toLowerCase().startsWith('realtime ') ||
      each.text.toLowerCase().startsWith('rca ')
  );
  if (breadcrumbs.length) {
    breadcrumbs = breadcrumbs.map((each) => {
      if (
        each.text.toLowerCase().startsWith('playback ') ||
        each.text.toLowerCase().startsWith('realtime ') ||
        each.text.toLowerCase().startsWith('rca ')
      ) {
        return {
          ...each,
          text: 'Graph View',
        };
      } else { 
          return each;
        }
      });
  } else {
    breadcrumbs = [];
  }

  if (!model.hasControls()) {
    // To still have spacing when no controls are rendered
    return <Box padding={1} />;
  }

  return (
    <div className={styles.controlContainer} style={ !model.hideVariables() ? { marginBottom: '5vh'} : {}}>
      <div
        data-testid={selectors.pages.Dashboard.Controls}
        className={cx(styles.controls, editPanel && styles.controlsPanelEdit)}
      >
        {!state.chromeless && (
          <Stack>
            <Breadcrumbs breadcrumbs={breadcrumbs} className={styles.breadcrumbsWrapper} />
          </Stack>
        )}
        {!hideTimeControls && (
          <Stack justifyContent={'flex-end'}>
            <timePicker.Component model={timePicker} />
            <refreshPicker.Component model={refreshPicker} />
          </Stack>
        )}
        {showDebugger && <SceneDebugger scene={model} key={'scene-debugger'} />}
      </div>
      {createPortal(
        <div className={styles.filterControl}>
          <Stack grow={1} wrap={'wrap'}>
            {!hideVariableControls && (
              <>
                <VariableControls dashboard={dashboard} />
                <DataLayerControls dashboard={dashboard} />
              </>
            )}
            <Box grow={1} />
            {!hideLinksControls && !editPanel && <DashboardLinksControls links={links} dashboard={dashboard} />}
            {editPanel && <PanelEditControls panelEditor={editPanel} />}
          </Stack>
        </div>,
        document.body
      )}
    </div>
  );
}

function DataLayerControls({ dashboard }: { dashboard: DashboardScene }) {
  const layers = sceneGraph.getDataLayers(dashboard, true);

  return (
    <>
      {layers.map((layer) => (
        <layer.Component model={layer} key={layer.state.key} />
      ))}
    </>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    controlContainer: css({
      display: 'flex',
      flexDirection: 'column'
    }),
    controls: css({
      display: 'flex',
      alignItems: 'flex-start',
      flex: '100%',
      gap: theme.spacing(1),
      flexDirection: 'row',
      flexWrap: 'nowrap',
      position: 'relative',
      width: '100%',
      // @Copyright 2025 BMC Software, Inc.
      // Date - 06/13/2025
      // Adjusted the dashboard control styles.
      justifyContent: 'space-between',
      padding:'0px 16px',
      background:'white',
      // END
      marginLeft: 'auto',
      [theme.breakpoints.down('sm')]: {
        flexDirection: 'column-reverse',
        alignItems: 'stretch',
      },
    }),
    breadcrumbsWrapper: css({
      display: 'flex',
      overflow: 'hidden',
      [theme.breakpoints.down('sm')]: {
        minWidth: '40%',
      },
    }),
    filterControl: css({
      label: 'filter-control',
      display: 'flex',
      position: 'absolute',
      top: '6vh',
      alignItems: 'flex-start',
      flex: '100%',
      padding: theme.spacing(2),
    }),
    controlsPanelEdit: css({
      // In panel edit we do not need any right padding as the splitter is providing it
      paddingRight: 0,
    }),
    embedded: css({
      background: 'unset',
      position: 'unset',
    }),
  };
}
