import React, { Dispatch, FC, SetStateAction } from 'react';
import { css } from '@emotion/css';
import { Button, Checkbox, stylesFactory, useTheme, HorizontalGroup } from '@grafana/ui';
import { GrafanaTheme, SelectableValue } from '@grafana/data';
import { ReportQuery } from '../types';
import { ActionRow } from './ActionRow';
import { Action } from './ConfirmEnableDisableModal';

type onSelectChange = (value: SelectableValue) => void;

export interface Props {
  allChecked?: boolean;
  showActions: any;
  deleteItem: () => void;
  cloneItem: () => void;
  executeReportsOnce: () => void;
  enableDisableItem: (action: Action) => void;
  hideLayout?: boolean;
  onLayoutChange: Dispatch<SetStateAction<any>>;
  onSortChange: onSelectChange;
  onToggleAllChecked: () => void;
  query: ReportQuery;
  editable?: boolean;
}

export const SearchResultsFilter: FC<Props> = ({
  allChecked,
  showActions,
  deleteItem,
  cloneItem,
  executeReportsOnce,
  enableDisableItem,
  hideLayout,
  onLayoutChange,
  onSortChange,
  onToggleAllChecked,
  query,
  editable,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <div className={styles.wrapper}>
      {editable && <Checkbox value={allChecked} onChange={onToggleAllChecked} />}
      {editable && (showActions.showDeleteAction || showActions.showEnableAction || showActions.showDisableAction) ? (
        <HorizontalGroup spacing="md">
          {showActions.showDeleteAction && (
            <Button onClick={deleteItem} icon="trash-alt" variant="destructive">
              Delete
            </Button>
          )}
          {showActions.showCloneAction && (
            <Button onClick={cloneItem} variant="secondary">
              Clone
            </Button>
          )}
          {showActions.showCloneAction && (
            <Button onClick={executeReportsOnce} variant="secondary">
              Run now
            </Button>
          )}
          {showActions.showEnableAction && (
            <Button onClick={(_) => enableDisableItem(Action.ENABLE)} variant="secondary">
              Enable
            </Button>
          )}
          {showActions.showDisableAction && (
            <Button onClick={(_) => enableDisableItem(Action.DISABLE)} variant="secondary">
              Disable
            </Button>
          )}
        </HorizontalGroup>
      ) : (
        <ActionRow
          {...{
            hideLayout,
            onLayoutChange,
            onSortChange,
            query,
          }}
        />
      )}
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  const { sm, md } = theme.spacing;
  return {
    wrapper: css`
      height: 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${sm};

      > label {
        height: 20px;
        margin: 0 ${md} 0 ${sm};
      }
    `,
  };
});
