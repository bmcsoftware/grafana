import React, { useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { FilterInput, HorizontalGroup, LinkButton, useStyles2 } from '@grafana/ui';

import { SortPicker } from './lib/SortPicker';
import { FilterPicker } from './lib/FilterPicker';
import { StatePicker } from './lib/StatePicker';
import { LayoutPicker } from './lib/LayoutPicker';

interface Props {
  search: {
    query?: string;
    view?: string;
    sort?: string;
    types?: string[];
    state?: string;
  };
  isFolder: boolean;

  onQueryChange: (_: string) => void;
  onLayoutChange: (_: string) => void;
  onSortChange: (_: string) => void;
  onReportTypeChange: (_: string[]) => void;
  onStateChange: (_: string) => void;
}

export const ReportConsoleAction: React.FC<Props> = ({
  search,
  isFolder,
  onSortChange,
  onQueryChange,
  onLayoutChange,
  onStateChange,
  onReportTypeChange,
}) => {
  const s = useStyles2(getStyles);
  const { query, view: layout, sort, types, state: reportState } = search;

  // This key is used to force a rerender on the inputs when the filters are cleared
  const [filterKey, _] = useState<number>(Math.floor(Math.random() * 100));
  const queryStringKey = `query-string-${filterKey}`;

  return (
    <div>
      <div className={s.marginBottom}>
        <div className={s.fullFlex}>
          <div className={s.fullFlex}>
            <FilterInput
              key={queryStringKey}
              value={query ?? ''}
              label="Search"
              placeholder={'Search by reports name'}
              onChange={onQueryChange}
              data-testid="search-query-input"
            />
          </div>
          {isFolder && (
            <LinkButton
              icon="arrow-left"
              variant="secondary"
              href={'reports/history'}
              style={{ marginLeft: '12px' }}
              className="w-42"
            >
              Back
            </LinkButton>
          )}
        </div>
      </div>

      <div className={s.marginBottom}>
        <HorizontalGroup align="flex-end" justify="space-between">
          <HorizontalGroup>
            {!isFolder && (
              <LayoutPicker value={layout as any} onChange={(value: any) => onLayoutChange(value as any)} />
            )}
            <StatePicker value={reportState as any} onChange={(value: any) => onStateChange(value as any)} />
          </HorizontalGroup>
          <HorizontalGroup>
            <SortPicker value={sort as any} onChange={(value: any) => onSortChange(value as any)} />
            <FilterPicker values={types as any} onChange={(value: any) => onReportTypeChange(value as any)} />
          </HorizontalGroup>
        </HorizontalGroup>
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  fullFlex: css`
    width: 100%;
    display: flex;
  `,
  marginBottom: css`
    margin-bottom: ${theme.spacing(2)};
  `,
});
