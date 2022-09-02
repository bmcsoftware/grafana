import React, { FC } from 'react';
import { css } from '@emotion/css';
import { AppEvents, GrafanaTheme2 } from '@grafana/data';
import { ConfirmModal, stylesFactory, useTheme2 } from '@grafana/ui';
import { ReportSection } from '../types';
import { getCheckedIds, getCheckedItems } from '../utils';
import { appEvents } from 'app/core/core';
import { reportsSrv } from 'app/core/services/reports_srv';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  results: ReportSection[];
}

export const ConfirmRunModal: FC<Props> = ({ results, isOpen, onDismiss }) => {
  const theme = useTheme2();
  const styles = getStyles(theme);

  const reportIds = getCheckedIds(results);
  const selectedItems = getCheckedItems(results);
  const reportName = selectedItems.length > 0 ? selectedItems[0].title : 'N/A';

  let title = `Schedule ${reportName}`;
  let subtitle = `This will send email to all recipients configured in the scheduled report.`;

  const runItems = () => {
    reportsSrv.executeReports(reportIds).then(
      (res) => {
        onDismiss();
        handleSuccess(res);
      },
      (error) => handleError(error)
    );
  };

  const handleSuccess = (res: any) => {
    appEvents.emit(AppEvents.alertSuccess, [res.message]);
    onDismiss();
  };

  const handleError = (error: any) => {
    let message = error.data.message ? error.data.message : `Failed to execute report`;
    appEvents.emit(AppEvents.alertError, [message]);
    onDismiss();
  };

  return isOpen ? (
    <ConfirmModal
      isOpen={isOpen}
      title={title}
      icon="apps"
      body={subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      confirmText="Confirm"
      onConfirm={runItems}
      onDismiss={onDismiss}
    />
  ) : null;
};

const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    subtitle: css`
      font-size: ${theme.v1.typography.size.base};
      padding-top: ${theme.v1.spacing.md};
    `,
  };
});
