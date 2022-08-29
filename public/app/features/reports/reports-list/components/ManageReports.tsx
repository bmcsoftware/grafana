import { GrafanaTheme } from '@grafana/data';
import { CallToActionCard, HorizontalGroup, Spinner, stylesFactory, useTheme, FilterInput } from '@grafana/ui';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import { contextSrv } from 'app/core/services/context_srv';
import { css } from '@emotion/css';
import React, { FC, memo, useState } from 'react';
import { ConnectProps, connectWithRouteParams, DispatchProps } from '../connect';
import { useManageReports } from '../hooks/useManageReports';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { SearchLayout } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ConfirmRunModal } from './ConfirmRunModal';
import { Action, ConfirmEnableDisableModal } from './ConfirmEnableDisableModal';
import { ReportActions } from './ReportActions';
import { SearchResults } from './SearchResults';
import { SearchResultsFilter } from './SearchResultsFilter';

export interface Props extends ConnectProps, DispatchProps {
  dashboard: any;
}

const { isEditor } = contextSrv;

export const ManageReports: FC<any> = memo(({ dashboard, params, updateLocation }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [enableDisableAction, setEnableDisableAction] = useState(Action.ENABLE);
  const [isEnableDisableModalOpen, setIsEnableDisableModalOpen] = useState(false);
  const queryParams = {
    layout: dashboard ? SearchLayout.List : SearchLayout.Folders,
    dashboard: dashboard,
    ...params,
  };
  const { query, hasFilters, onQueryChange, onSortChange, onLayoutChange } = useSearchQuery(
    queryParams,
    updateLocation
  );

  const {
    results,
    loading,
    initialLoading,
    allChecked,
    showActions,
    onToggleSection,
    onToggleChecked,
    onToggleAllChecked,
    onDeleteItems,
    onCloneItem,
    onEnableItems,
    onDisableItems,
    noFolders,
  } = useManageReports(dashboard, query, {});

  const onItemDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const onItemEnableDisable = (action: Action) => {
    setEnableDisableAction(action);
    setIsEnableDisableModalOpen(true);
  };

  const onItemRun = () => {
    setIsRunModalOpen(true);
  };

  const ctaStyle = css`
    text-align: center;
  `;

  if (initialLoading) {
    return <Spinner className={styles.spinner} />;
  }

  if (noFolders && !hasFilters) {
    return isEditor ? (
      <EmptyListCTA
        title="You haven't created any reports yet."
        buttonIcon="plus"
        buttonTitle="Create Report"
        onClick={() => {
          let queryParams = location.search
            .slice(1)
            .split('&')
            .map((e) => e.includes('var') && e)
            .filter(Boolean)
            .join('&');
          if (queryParams !== '') {
            sessionStorage.setItem('reportFilter', queryParams);
          }
          location.href = location.pathname + '/new';
        }}
      />
    ) : (
      <CallToActionCard
        className={ctaStyle}
        message={'No reports created yet for this dashboard'}
        callToActionElement={<></>}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div>
        <HorizontalGroup justify="space-between">
          <FilterInput value={query.query} onChange={onQueryChange} placeholder={'Search report by name'} />
          <ReportActions dashboard={dashboard} canEdit={isEditor} />
        </HorizontalGroup>
      </div>

      <div className={styles.results}>
        <SearchResultsFilter
          allChecked={allChecked}
          showActions={showActions}
          deleteItem={onItemDelete}
          cloneItem={onCloneItem}
          executeReportsOnce={onItemRun}
          enableDisableItem={(action) => onItemEnableDisable(action)}
          onToggleAllChecked={onToggleAllChecked}
          onSortChange={onSortChange}
          query={query}
          hideLayout={!!dashboard}
          onLayoutChange={onLayoutChange}
          editable={isEditor}
        />
        <SearchResults
          loading={loading}
          results={results}
          editable={isEditor}
          onToggleSection={onToggleSection}
          onToggleChecked={onToggleChecked}
          layout={query.layout}
          sort={query.sort}
        />
      </div>
      <ConfirmRunModal isOpen={isRunModalOpen} onDismiss={() => setIsRunModalOpen(false)} results={results} />
      <ConfirmDeleteModal
        onDeleteItems={onDeleteItems}
        results={results}
        isOpen={isDeleteModalOpen}
        onDismiss={() => setIsDeleteModalOpen(false)}
      />
      <ConfirmEnableDisableModal
        onEnableItems={onEnableItems}
        onDisableItems={onDisableItems}
        results={results}
        action={enableDisableAction}
        isOpen={isEnableDisableModalOpen}
        onDismiss={() => setIsEnableDisableModalOpen(false)}
      />
    </div>
  );
});

ManageReports.displayName = 'ManageReports';

export default connectWithRouteParams(ManageReports);

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    container: css`
      height: 100%;
    `,
    results: css`
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      padding-top: ${theme.spacing.xl};
    `,
    spinner: css`
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    `,
  };
});
