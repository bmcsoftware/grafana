import { css } from '@emotion/css';
import React, { FC } from 'react';

import { GrafanaTheme } from '@grafana/data';
import { Button, HorizontalGroup, Modal, stylesFactory, useTheme } from '@grafana/ui';
import { useAppNotification } from 'app/core/copy/appNotification';
import { bulkLimit, bulkLimitMsg } from 'app/features/manage-dashboards/bulkoperation/pages/import';
import { exportDashboards as _exportDashboards } from 'app/features/manage-dashboards/state/actions';

import { OnMoveOrDeleleSelectedItems } from '../../types';

interface Props {
  onExportDone: OnMoveOrDeleleSelectedItems;
  results: Map<string, Set<string>>;
  isOpen: boolean;
  onDismiss: () => void;
}

export const ConfirmExportModal: FC<Props> = ({ onExportDone, results, isOpen, onDismiss }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const notifyApp = useAppNotification();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const dashboards = Array.from(results.get('dashboard') ?? []);
  const dashCount = dashboards.length;
  const isExportable = dashCount <= bulkLimit;

  let text = 'Do you want to export the ';
  const dashEnding = dashCount === 1 ? '' : 's';
  text += `${dashCount} selected dashboard${dashEnding}?`;

  const exportDashboards = () => {
    setIsDownloading(true);
    _exportDashboards({
      dashUids: dashboards,
    })
      .then(() => {
        onExportDone();
        notifyApp.success('Exported successfully');
      })
      .catch((err: any) => {
        notifyApp.error('Export failed', err?.data?.message || err.message);
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  return isOpen ? (
    <Modal className={styles.modal} title="Export" isOpen={isOpen} onDismiss={onDismiss}>
      {isExportable ? (
        <>
          <div className={styles.content}>{text}</div>

          <HorizontalGroup justify="center">
            <Button
              icon={isDownloading ? 'fa fa-spinner' : undefined}
              disabled={isDownloading}
              variant="primary"
              onClick={exportDashboards}
            >
              Export
            </Button>
            <Button variant="secondary" onClick={onDismiss}>
              Cancel
            </Button>
          </HorizontalGroup>
        </>
      ) : (
        <div className={styles.content}>{bulkLimitMsg}</div>
      )}
    </Modal>
  ) : null;
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    modal: css`
      width: 500px;
    `,
    content: css`
      margin-bottom: ${theme.spacing.lg};
      font-size: 16px;
    `,
  };
});
