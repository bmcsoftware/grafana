import React, { FC, useCallback } from 'react';
import { css } from '@emotion/css';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { GrafanaTheme } from '@grafana/data';
import { stylesFactory, useTheme, Spinner } from '@grafana/ui';
import { selectors } from '@grafana/e2e-selectors';
import { CalcFieldModule, OnToggleChecked, SearchLayout, CalcFieldItem } from '../../types';
import { SEARCH_ITEM_HEIGHT, SEARCH_ITEM_MARGIN } from '../../constants';
import { SearchItem } from './SearchItem';
import { SectionHeader } from './SectionHeader';
import { sortSectionResults, sortListResults, filterByType, filterByQuery } from '../../utils';
import { cloneDeep as _cloneDeep } from 'lodash';

export interface Props {
  editable: boolean;
  loading?: boolean;
  onToggleChecked?: OnToggleChecked;
  onToggleSection: (section: CalcFieldModule) => void;
  results: CalcFieldModule[] | CalcFieldItem[];
  layout: SearchLayout.Module | SearchLayout.List;
  sort: any;
  filterType: string;
  query: string;
}

const { section: sectionLabel, items: itemsLabel } = selectors.components.Search;

export const SearchResults: FC<Props> = ({
  editable,
  loading,
  onToggleChecked,
  onToggleSection,
  results,
  layout,
  sort,
  filterType,
  query,
}) => {
  const theme = useTheme();
  const styles = getSectionStyles(theme);
  const itemProps = { editable, onToggleChecked };

  const noMatchFoundTemp = useCallback(() => {
    return <div className={styles.noResults}>No calculated fields matching your query were found.</div>;
  }, [styles.noResults]);

  const renderFolders = () => {
    const filteredResults = filterByQuery(results, query, layout);
    sortSectionResults(filteredResults as CalcFieldModule[], sort);
    return filteredResults.length ? (
      <div className={styles.wrapper}>
        {(filteredResults as CalcFieldModule[]).map((section) => {
          return (
            <div aria-label={sectionLabel} className={styles.section} key={section.id || section.title}>
              <SectionHeader
                onSectionClick={(section: CalcFieldModule) => {
                  return !query ? onToggleSection(section) : null;
                }}
                {...{ editable, section }}
              />
              {section.expanded && (
                <div aria-label={itemsLabel} className={styles.sectionItems}>
                  {section.items.map((item) => (
                    <SearchItem key={item.fieldId || item.name} {...itemProps} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      noMatchFoundTemp()
    );
  };

  const renderList = () => {
    let items: CalcFieldItem[] = filterByQuery(results, query, layout) as CalcFieldItem[];
    items = filterByType(items, filterType);
    sortListResults(items, sort);

    return items.length ? (
      <div className={styles.listModeWrapper}>
        <AutoSizer disableWidth>
          {({ height }) => (
            <FixedSizeList
              aria-label="Search items"
              className={styles.wrapper}
              innerElementType="ul"
              itemSize={SEARCH_ITEM_HEIGHT + SEARCH_ITEM_MARGIN}
              height={height}
              itemCount={items.length}
              width="100%"
            >
              {({ index, style }) => {
                const item = items[index];
                // The wrapper div is needed as the inner SearchItem has margin-bottom spacing
                // And without this wrapper there is no room for that margin
                return (
                  <div style={style}>
                    <SearchItem key={item.fieldId || item.name} {...itemProps} item={item} />
                  </div>
                );
              }}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    ) : (
      noMatchFoundTemp()
    );
  };

  if (loading) {
    return <Spinner className={styles.spinner} />;
  } else if (!results || !results.length) {
    return noMatchFoundTemp();
  }

  return (
    <div className={styles.resultsContainer}>{layout === SearchLayout.Module ? renderFolders() : renderList()}</div>
  );
};

const getSectionStyles = stylesFactory((theme: GrafanaTheme) => {
  const { md } = theme.spacing;

  return {
    wrapper: css`
      display: flex;
      flex-direction: column;
    `,
    section: css`
      display: flex;
      flex-direction: column;
      background: ${theme.colors.panelBg};
      border-bottom: solid 1px ${theme.colors.border2};
    `,
    sectionItems: css`
      margin: 0 24px 0 32px;
    `,
    spinner: css`
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100px;
    `,
    resultsContainer: css`
      position: relative;
      flex-grow: 10;
      margin-bottom: ${md};
      background: ${theme.colors.bg1};
      border: 1px solid ${theme.colors.border1};
      border-radius: 3px;
      height: 300px;
      overflow: auto;
    `,
    noResults: css`
      padding: ${md};
      background: ${theme.colors.bg2};
      font-style: italic;
      padding-top: ${theme.spacing.md};
    `,
    listModeWrapper: css`
      position: relative;
      height: 100%;
      padding: ${md};
    `,
  };
});
