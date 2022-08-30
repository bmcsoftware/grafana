import { AppEvents, GrafanaTheme } from '@grafana/data';
import { getLocationSrv } from '@grafana/runtime';
import { ConfirmModal, stylesFactory, useTheme } from '@grafana/ui';
import { appEvents } from 'app/core/core';
import { css } from '@emotion/css';
import React, { FC } from 'react';
import { ReportsSrv } from '../../../../core/services/reports_srv';
import { OnDisableItems, OnEnableItems, ReportSection } from '../types';
import { getCheckedIds } from '../utils';

export enum Action {
  ENABLE,
  DISABLE,
}

interface Props {
  onDisableItems: OnDisableItems;
  onEnableItems: OnEnableItems;
  results: ReportSection[];
  action: Action;
  isOpen: boolean;
  onDismiss: () => void;
}

const reportsSrv = new ReportsSrv();

export const ConfirmEnableDisableModal: FC<Props> = ({
  results,
  onEnableItems,
  onDisableItems,
  action,
  isOpen,
  onDismiss,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const reportsIds = getCheckedIds(results);
  const repCount = reportsIds.length;

  const repEnding = repCount === 1 ? '' : 's';
  const repAction = action === Action.ENABLE ? 'enable' : 'disable';
  let text = `Do you want to ${repAction} the selected report${repEnding}?`;
  let subtitle;

  const enableItems = () => {
    reportsSrv.enableReports(reportsIds).then(
      (res) => handleSuccess(res),
      (error) => handleError(error)
    );
  };

  const disableItems = () => {
    reportsSrv.disableReports(reportsIds).then(
      (res) => handleSuccess(res),
      (error) => handleError(error)
    );
  };

  const handleSuccess = (res: any) => {
    appEvents.emit(AppEvents.alertSuccess, [res.message]);
    onDismiss();
    getLocationSrv().update({ path: 'reports' });
    onDisableItems();
  };

  const handleError = (error: any) => {
    let message = error.data.message
      ? error.data.message
      : `Failed to ${repAction} report${reportsIds.length > 1 ? 's' : ''}`;
    appEvents.emit(AppEvents.alertError, [message]);
    onDismiss();
  };

  return isOpen ? (
    <ConfirmModal
      isOpen={isOpen}
      title={action === Action.ENABLE ? 'Enable' : 'Disable'}
      body={
        <>
          {text} {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </>
      }
      confirmText={action === Action.ENABLE ? 'Enable' : 'Disable'}
      onConfirm={action === Action.ENABLE ? enableItems : disableItems}
      onDismiss={onDismiss}
    />
  ) : null;
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    subtitle: css`
      font-size: ${theme.typography.size.base};
      padding-top: ${theme.spacing.md};
    `,
  };
});
