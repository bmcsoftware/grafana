import { css, cx } from '@emotion/css';
import React, { CSSProperties, useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { config, useChromeHeaderHeight } from '@grafana/runtime';
import { useSceneObjectState } from '@grafana/scenes';
import { ElementSelectionContext, useStyles2 } from '@grafana/ui';
import NativeScrollbar, { DivScrollElement } from 'app/core/components/NativeScrollbar';

import { useSnappingSplitter } from '../panel-edit/splitter/useSnappingSplitter';
import { DashboardScene } from '../scene/DashboardScene';
import { NavToolbarActions } from '../scene/NavToolbarActions';

import { DashboardEditPaneRenderer } from './DashboardEditPane';
import { useEditPaneCollapsed } from './shared';

interface Props {
  dashboard: DashboardScene;
  isEditing?: boolean;
  body?: React.ReactNode;
  controls?: React.ReactNode;
}

export function DashboardEditPaneSplitter({ dashboard, isEditing, body, controls }: Props) {
  const headerHeight = useChromeHeaderHeight();
  const { editPane } = dashboard.state;
  const styles = useStyles2(getStyles, headerHeight ?? 0);
  const [isCollapsed, setIsCollapsed] = useEditPaneCollapsed();

  if (!config.featureToggles.dashboardNewLayouts) {
    return (
      <NativeScrollbar onSetScrollRef={dashboard.onSetScrollRef}>
        <div className={styles.canvasWrappperOld}>
          {/*
            // @Copyright 2025 BMC Software, Inc.
            // Date - 06/13/2025
            // Hide Unused toolbar actions.
            <NavToolbarActions dashboard={dashboard} /> 
            // END
          */}
          <div className={styles.controlsWrapperSticky}>{controls}</div>
          {/* 
            // @Copyright 2025 BMC Software, Inc.
            // Date - 06/13/2025
            // Add Sticky header. */}
          <div className={styles.stickyHeader}></div>
          {/* // END */}
          <div className={styles.body}>{body}</div>
        </div>
      </NativeScrollbar>
    );
  }

  const { containerProps, primaryProps, secondaryProps, splitterProps, splitterState, onToggleCollapse } =
    useSnappingSplitter({
      direction: 'row',
      dragPosition: 'end',
      initialSize: 0.8,
      handleSize: 'sm',
      collapsed: isCollapsed,

      paneOptions: {
        collapseBelowPixels: 250,
        snapOpenToPixels: 400,
      },
    });

  useEffect(() => {
    setIsCollapsed(splitterState.collapsed);
  }, [splitterState.collapsed, setIsCollapsed]);

  const { selectionContext } = useSceneObjectState(editPane, { shouldActivateOrKeepAlive: true });
  const containerStyle: CSSProperties = {};

  if (!isEditing) {
    primaryProps.style.flexGrow = 1;
    primaryProps.style.width = '100%';
    primaryProps.style.minWidth = 'unset';
    containerStyle.overflow = 'unset';
  }

  const onBodyRef = (ref: HTMLDivElement) => {
    dashboard.onSetScrollRef(new DivScrollElement(ref));
  };

  return (
    <div {...containerProps} style={containerStyle}>
      <ElementSelectionContext.Provider value={selectionContext}>
        <div
          {...primaryProps}
          className={cx(primaryProps.className, styles.canvasWithSplitter)}
          onPointerDown={(evt) => {
            if (evt.shiftKey) {
              return;
            }

            editPane.clearSelection();
          }}
        >
          <NavToolbarActions dashboard={dashboard} />
          <div className={cx(!isEditing && styles.controlsWrapperSticky)}>{controls}</div>
          {/* 
            // @Copyright 2025 BMC Software, Inc.
            // Date - 06/13/2025
            // Add Sticky header. */}
          <div className={styles.stickyHeader}></div>
          {/* // END */}
          <div className={styles.bodyWrapper}>
            <div className={cx(styles.body, isEditing && styles.bodyEditing)} ref={onBodyRef}>
              {body}
            </div>
          </div>
        </div>
        {isEditing && (
          <>
            <div {...splitterProps} data-edit-pane-splitter={true} />
            <div {...secondaryProps} className={cx(secondaryProps.className, styles.editPane)}>
              <DashboardEditPaneRenderer
                editPane={editPane}
                isCollapsed={splitterState.collapsed}
                onToggleCollapse={onToggleCollapse}
                openOverlay={selectionContext.selected.length > 0}
              />
            </div>
          </>
        )}
      </ElementSelectionContext.Provider>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2, headerHeight: number) {
  return {
    canvasWrappperOld: css({
      label: 'canvas-wrapper-old',
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    }),
    canvasWithSplitter: css({
      overflow: 'unset',
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    }),
    canvasWithSplitterEditing: css({
      overflow: 'unset',
    }),
    // @Copyright 2025 BMC Software, Inc.
      // Date - 06/13/2025
      // Added a sticky header.
      stickyHeader: css({
        position: 'fixed',
        height:'32px',
        width: '100%',
        zIndex: 100,
        background: 'white',
        boxShadow:'rgba(0, 0, 0, 0.04) 0px 4px 8px',
        top:0
      }),
      // END
    bodyWrapper: css({
      label: 'body-wrapper',
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      position: 'relative'
    }),
    body: css({
      label: 'body',
      display: 'flex',
      flexGrow: 1,
      gap: '8px',
      boxSizing: 'border-box',
      flexDirection: 'column',
      // @Copyright 2025 BMC Software, Inc.
      // Date - 06/13/2025
      // Update top padding.
      padding: theme.spacing(2),
      // END
    }),
    bodyEditing: css({
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto',
      scrollbarWidth: 'thin',
      // The fixed controls headers is otherwise rendered over the selection outlinem, Maybe there is an other solution
      paddingTop: '2px',
    }),
    editPane: css({
      flexDirection: 'column',
      borderLeft: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.primary,
    }),
    controlsWrapperSticky: css({
      // @Copyright 2025 BMC Software, Inc.
      // Date - 06/13/2025
      // Added bottom spacing.
      marginBottom: theme.spacing(2),
      // END
      [theme.breakpoints.up('md')]: {
        position: 'sticky',
        zIndex: theme.zIndex.activePanel,
        // @Copyright 2025 BMC Software, Inc.
        // Date - 06/13/2025
        // Adjusted dashboard controls positioning.
        top: 0,
        // END
      },
    }),
  };
}
