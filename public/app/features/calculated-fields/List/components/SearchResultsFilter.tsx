import { css } from '@emotion/css';
import React, { Dispatch, FC, SetStateAction } from 'react';

import { GrafanaTheme, SelectableValue } from '@grafana/data';
import { Button, stylesFactory, useTheme, HorizontalGroup } from '@grafana/ui';

import { ModifyActions, SearchQuery } from '../../types';

import { ActionRow } from './ActionRow';

type onSelectChange = (value: SelectableValue) => void;

export interface Props {
  showActions: any;
  deleteItem: () => void;
  itemAction: (action: string) => void;
  hideLayout?: boolean;
  onLayoutChange: Dispatch<SetStateAction<any>>;
  onSortChange: onSelectChange;
  query: SearchQuery;
  editable?: boolean;
  typeOptions: string[];
  onFilterTypeChange: onSelectChange;
}

export const SearchResultsFilter: FC<Props> = ({
  showActions,
  deleteItem,
  itemAction,
  hideLayout,
  onLayoutChange,
  onSortChange,
  query,
  editable,
  typeOptions,
  onFilterTypeChange,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <div className={styles.wrapper}>
      {editable && (showActions.showDeleteAction || showActions.showEditAction || showActions.showCloneAction) ? (
        <HorizontalGroup spacing="md">
          {showActions.showDeleteAction && (
            <Button onClick={deleteItem} icon="trash-alt" variant="destructive">
              Delete
            </Button>
          )}
          {showActions.showEditAction && (
            <Button
              onClick={() => {
                itemAction(ModifyActions.EDIT);
              }}
              icon="edit"
              variant="primary"
            >
              Edit
            </Button>
          )}
          {showActions.showCloneAction && (
            <Button
              onClick={() => {
                itemAction(ModifyActions.CLONE);
              }}
              variant="secondary"
            >
              Clone
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
            typeOptions,
            onFilterTypeChange,
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
