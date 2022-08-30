import { locationUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { useMemo, useReducer } from 'react';
import { TOGGLE_CHECKED } from '../reducers/actionTypes';
import { searchReducer, fieldsSearchState, FieldsSearchState } from '../reducers/fieldSearch';
import {
  OnCloneItem,
  OnToggleChecked,
  SearchQuery,
  CalcFieldModule,
  CalcFieldItem,
  SearchLayout,
  FieldType,
} from '../../types';
import { useSearch } from './useSearch';
import { getCheckedItem } from '../../utils';

export const useManageFields = (query: SearchQuery, queryDispatch: any) => {
  const reducer = useReducer(searchReducer, {
    ...fieldsSearchState,
  });

  const {
    state: { results, loading, initialLoading },
    onToggleSection,
    dispatch,
    onDeleteItems,
  } = useSearch<FieldsSearchState>(query, reducer, queryDispatch);

  const onToggleChecked: OnToggleChecked = (item) => {
    dispatch({ type: TOGGLE_CHECKED, payload: { selectedItem: item, layout: query.layout } });
  };

  const onCloneItem: OnCloneItem = () => {
    const checkedItem = getCheckedItem(results, query.layout);
    if (checkedItem) {
      const pathname = locationUtil.stripBaseFromUrl(`calculated-fields/clone/${checkedItem.fieldId}`);
      locationService.push({ pathname });
    }
  };

  const showActions = useMemo(() => {
    const checkedItem: CalcFieldItem[] = [];
    let allowedDelete = true;
    query.layout === SearchLayout.Module
      ? (results as CalcFieldModule[]).map((result: CalcFieldModule) => {
          return result.items?.map((item: CalcFieldItem) => {
            if (item.checked) {
              checkedItem.push(item);
              allowedDelete = item.field_type === FieldType.OOTB ? false : allowedDelete;
            }
          });
        })
      : (results as CalcFieldItem[]).map((item: CalcFieldItem) => {
          if (item.checked) {
            checkedItem.push(item);
            allowedDelete = item.field_type === FieldType.OOTB ? false : allowedDelete;
          }
        });

    return {
      showDeleteAction: allowedDelete && checkedItem.length,
      showCloneAction: checkedItem.length === 1,
    };
  }, [results, query.layout]);

  const typeOptions = useMemo(() => {
    const options = new Set<string>();
    if (query.layout === SearchLayout.Module) {
      (results as CalcFieldModule[]).map((result: CalcFieldModule) => {
        result.items?.map((item: CalcFieldItem) => {
          return item.field_type ? options.add(item.field_type) : null;
        });
      });
    } else {
      (results as CalcFieldItem[]).map((item: CalcFieldItem) => {
        return item.field_type ? options.add(item.field_type) : null;
      });
    }
    return [...options];
  }, [results, query.layout]);

  const noFolders = results.length === 0 && !loading && !initialLoading;

  return {
    results,
    loading,
    initialLoading,
    showActions,
    onToggleSection,
    onToggleChecked,
    onDeleteItems,
    onCloneItem,
    noFolders,
    typeOptions,
  };
};
