import React, { FC } from 'react';
import { css } from '@emotion/css';
import { AppEvents, GrafanaTheme } from '@grafana/data';
import { ConfirmModal, stylesFactory, useTheme } from '@grafana/ui';
import { getLocationSrv } from '@grafana/runtime';
import { ReportSection, OnDeleteItems } from '../types';
import { getCheckedIds } from '../utils';
import { ReportsSrv } from '../../../../core/services/reports_srv';
import { appEvents } from 'app/core/core';

interface Props {
  onDeleteItems: OnDeleteItems;
  results: ReportSection[];
  isOpen: boolean;
  onDismiss: () => void;
}

const reportsSrv = new ReportsSrv();

export const ConfirmDeleteModal: FC<Props> = ({ results, onDeleteItems, isOpen, onDismiss }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const reportsIds = getCheckedIds(results);
  const repCount = reportsIds.length;

  const repEnding = repCount === 1 ? '' : 's';
  let text = `Do you want to delete the selected report${repEnding}?`;
  let subtitle;

  const deleteItems = () => {
    reportsSrv.deleteReports(reportsIds).then(
      (res) => {
        onDismiss();
        getLocationSrv().update({ path: 'reports' });
        onDeleteItems();
      },
      (error) => {
        let message = error.data.message
          ? error.data.message
          : `Failed to delete report${reportsIds.length > 1 ? 's' : ''}`;
        appEvents.emit(AppEvents.alertError, [message]);
        onDismiss();
      }
    );
  };

  return isOpen ? (
    <ConfirmModal
      isOpen={isOpen}
      title="Delete"
      body={
        <>
          {text} {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </>
      }
      confirmText="Delete"
      onConfirm={deleteItems}
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
