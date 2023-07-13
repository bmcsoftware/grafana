import { css, keyframes } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
// @Copyright 2023 BMC Software, Inc.
// Date - 06/09/2023
// Commented unused import
// import { locationService } from '@grafana/runtime';
// import { Button, HorizontalGroup, Spinner, useStyles2, VerticalGroup } from '@grafana/ui';
// END
import { HorizontalGroup, Spinner, useStyles2, VerticalGroup } from '@grafana/ui';
import { DashboardInitPhase } from 'app/types';

export interface Props {
  initPhase: DashboardInitPhase;
}

export const DashboardLoading = ({ initPhase }: Props) => {
  const styles = useStyles2(getStyles);

  // @Copyright 2023 BMC Software, Inc.
  // Date - 06/09/2023
  // Commented unused functions

  /* const cancelVariables = () => {
    locationService.push('/');
  }; */

  return (
    <div className={styles.dashboardLoading}>
      <div className={styles.dashboardLoadingText}>
        <VerticalGroup spacing="md">
          <HorizontalGroup align="center" justify="center" spacing="xs">
            <Spinner inline={true} /> {initPhase}
          </HorizontalGroup>{' '}
          {/*
          // @Copyright 2023 BMC Software, Inc.
          // Date - 06/14/2023
          // Remove button

         <HorizontalGroup align="center" justify="center">
            <Button variant="secondary" size="md" icon="repeat" onClick={cancelVariables}>
              Cancel loading dashboard
            </Button>
          </HorizontalGroup>

          //END */}
        </VerticalGroup>
      </div>
    </div>
  );
};

export const getStyles = (theme: GrafanaTheme2) => {
  // Amount of time we want to pass before we start showing loading spinner
  const slowStartThreshold = '0.5s';

  const invisibleToVisible = keyframes`
    0% { opacity: 0%; }
    100% { opacity: 100%; }
  `;

  return {
    dashboardLoading: css`
      height: 60vh;
      display: flex;
      opacity: 0%;
      align-items: center;
      justify-content: center;
      animation: ${invisibleToVisible} 0s step-end ${slowStartThreshold} 1 normal forwards;
    `,
    dashboardLoadingText: css`
      font-size: ${theme.typography.h4.fontSize};
    `,
  };
};
