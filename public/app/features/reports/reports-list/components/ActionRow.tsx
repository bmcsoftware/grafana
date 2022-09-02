import { GrafanaTheme, SelectableValue } from '@grafana/data';
import { HorizontalGroup, RadioButtonGroup, stylesFactory, useTheme } from '@grafana/ui';
import { css } from 'emotion';
import React, { Dispatch, FC, SetStateAction } from 'react';
import { ReportQuery, SearchLayout } from '../types';
import { SortPicker } from './SortPicker';

export const layoutOptions = [
  { value: SearchLayout.Folders, icon: 'folder' },
  { value: SearchLayout.List, icon: 'list-ul' },
];

type onSelectChange = (value: SelectableValue) => void;
interface Props {
  onLayoutChange: Dispatch<SetStateAction<string>>;
  onSortChange: onSelectChange;
  query: ReportQuery;
  hideLayout?: boolean;
}

export const ActionRow: FC<Props> = ({ onLayoutChange, onSortChange, query, hideLayout }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <div className={styles.actionRow}>
      <div className={styles.rowContainer}>
        <HorizontalGroup spacing="md" width="auto">
          {!hideLayout ? (
            <RadioButtonGroup options={layoutOptions} onChange={onLayoutChange} value={query.layout} />
          ) : null}
          <SortPicker onChange={onSortChange} value={query.sort?.value} />
        </HorizontalGroup>
      </div>
    </div>
  );
};

ActionRow.displayName = 'ActionRow';

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    actionRow: css`
      display: none;

      @media only screen and (min-width: ${theme.breakpoints.md}) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: ${theme.spacing.lg} 0;
        width: 100%;
      }
    `,
    rowContainer: css`
      margin-right: ${theme.spacing.md};
    `,
    checkboxWrapper: css`
      label {
        line-height: 1.2;
      }
    `,
  };
});
