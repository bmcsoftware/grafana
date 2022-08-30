import React, { Dispatch, FC, SetStateAction } from 'react';
import { css } from '@emotion/css';
import { Button, stylesFactory, useTheme, HorizontalGroup } from '@grafana/ui';
import { GrafanaTheme, SelectableValue } from '@grafana/data';
import { SearchQuery } from '../../types';
import { ActionRow } from './ActionRow';

type onSelectChange = (value: SelectableValue) => void;

export interface Props {
  showActions: any;
  deleteItem: () => void;
  cloneItem: () => void;
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
  cloneItem,
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
      {editable && (showActions.showDeleteAction || showActions.showCloneAction) ? (
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
