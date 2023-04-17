import { css } from '@emotion/css';
import React, { FC } from 'react';

import { GrafanaTheme } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { ConfirmModal, stylesFactory, useTheme } from '@grafana/ui';

import { CalcFieldItem, CalcFieldModule, OnDeleteItems, SearchLayout } from '../../types';
import { getCheckedIds } from '../../utils';

interface Props {
  onDeleteItems: OnDeleteItems;
  results: CalcFieldModule[] | CalcFieldItem[];
  isOpen: boolean;
  onDismiss: () => void;
  layout: SearchLayout.Module | SearchLayout.List;
}

export const ConfirmDeleteModal: FC<Props> = ({ results, onDeleteItems, isOpen, onDismiss, layout }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const fields = getCheckedIds(results, layout);
  const repCount = fields.length;

  const repEnding = repCount === 1 ? '' : 's';
  let text = `Do you want to delete the selected calculated field${repEnding}?`;

  const deleteItems = () => {
    onDeleteItems(fields.map((item) => Number((item.fieldId as string).split('_')[1])))
      .then(() => {
        onDismiss();
        locationService.push({ pathname: '/calculated-fields' });
      })
      .finally(() => {
        onDismiss();
      });
  };

  return isOpen ? (
    <ConfirmModal
      isOpen={isOpen}
      title="Delete"
      body={
        <>
          {text}
          {
            <div className={styles.subtitle}>
              {fields.map((item: CalcFieldItem) => {
                return <span key={item.name}>{`${item.module} -> ${item.name}`}</span>;
              })}
            </div>
          }
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
      display: flex;
      flex-direction: column;
    `,
  };
});
