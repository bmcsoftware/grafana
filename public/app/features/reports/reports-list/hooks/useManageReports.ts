import { locationUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { useMemo, useReducer } from 'react';
import { ReportsSrv } from 'app/core/services/reports_srv';
import { FETCH_RESULTS, TOGGLE_ALL_CHECKED, TOGGLE_CHECKED } from '../reducers/actionTypes';
import { manageReportsReducer, manageReportsState, ManageReportsState } from '../reducers/manageReports';
import {
  OnCloneItem,
  OnDeleteItems,
  OnDisableItems,
  OnEnableItems,
  OnToggleChecked,
  ReportQuery,
  ReportSection,
  ReportSectionItem,
} from '../types';
import { useSearch } from './useSearch';
import { getCheckedItems } from '../utils';

const reportsSrv = new ReportsSrv();

export const useManageReports = (dashboard: any, query: ReportQuery, state: Partial<ManageReportsState> = {}) => {
  const reducer = useReducer(manageReportsReducer, {
    ...manageReportsState,
    ...state,
  });

  const {
    state: { results, loading, initialLoading, allChecked },
    onToggleSection,
    dispatch,
  } = useSearch<ManageReportsState>(query, reducer, { dashboard: dashboard });

  const onToggleChecked: OnToggleChecked = (item) => {
    dispatch({ type: TOGGLE_CHECKED, payload: item });
  };

  const onToggleAllChecked = () => {
    dispatch({ type: TOGGLE_ALL_CHECKED });
  };

  const onEnableItems: OnEnableItems = () => {
    reportsSrv.getReports(query, dashboard).then((results) => {
      dispatch({ type: FETCH_RESULTS, payload: results });
    });
  };

  const onDisableItems: OnDisableItems = () => {
    reportsSrv.getReports(query, dashboard).then((results) => {
      dispatch({ type: FETCH_RESULTS, payload: results });
    });
  };

  const onDeleteItems: OnDeleteItems = () => {
    reportsSrv.getReports(query, dashboard).then((results) => {
      dispatch({ type: FETCH_RESULTS, payload: results });
    });
  };

  const onCloneItem: OnCloneItem = () => {
    const checkedItem: ReportSectionItem[] = getCheckedItems(results);
    const pathname = locationUtil.stripBaseFromUrl(`reports/clone/${checkedItem[0].id}`);
    locationService.push({ pathname });
  };

  const showActions = useMemo(() => {
    const checkedItems: ReportSectionItem[] = results.reduce((acc: ReportSectionItem[], result: ReportSection) => {
      if (result.checked) {
        acc = [...acc, ...result.items];
      } else {
        const filteredItems: ReportSectionItem[] = result.items.filter((item: ReportSectionItem) => item.checked);
        if (filteredItems) {
          acc = [...acc, ...filteredItems];
        }
      }
      return acc;
    }, []);
    const showClone: boolean = checkedItems.length === 1;
    const showDelete: boolean = checkedItems.length > 0;
    const showEnable: boolean = checkedItems.filter((item: ReportSectionItem) => !item.enabled).length > 0;
    const showDisable: boolean = checkedItems.filter((item: ReportSectionItem) => item.enabled).length > 0;

    return {
      showCloneAction: showClone,
      showDeleteAction: showDelete,
      showEnableAction: showEnable,
      showDisableAction: showDisable,
    };
  }, [results]);

  const noFolders = results.length === 0 && !loading && !initialLoading;

  return {
    results,
    loading,
    initialLoading,
    allChecked,
    showActions,
    onToggleSection,
    onToggleChecked,
    onToggleAllChecked,
    onEnableItems,
    onDisableItems,
    onDeleteItems,
    onCloneItem,
    noFolders,
  };
};
