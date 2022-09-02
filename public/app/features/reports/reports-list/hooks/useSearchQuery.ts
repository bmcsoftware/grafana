import { useReducer } from 'react';
import { SelectableValue } from '@grafana/data';
import { defaultQuery, queryReducer } from '../reducers/searchQueryReducer';
import { LAYOUT_CHANGE, QUERY_CHANGE, TOGGLE_SORT } from '../reducers/actionTypes';
import { ReportQuery, RouteParams, SearchLayout } from '../types';
import { hasFilters } from '../utils';

export const useSearchQuery = (queryParams: Partial<ReportQuery>, updateLocation = (args: any) => {}) => {
  const updateLocationQuery = (query: RouteParams) => updateLocation({ query, partial: true });
  const initialState = { ...defaultQuery, ...queryParams };
  const [query, dispatch] = useReducer(queryReducer, initialState);

  const onQueryChange = (query: string) => {
    dispatch({ type: QUERY_CHANGE, payload: query });
    updateLocationQuery({ query });
  };

  const onSortChange = (sort: SelectableValue | null) => {
    dispatch({ type: TOGGLE_SORT, payload: sort });
    updateLocationQuery({ sort: sort?.value, layout: SearchLayout.List });
  };

  const onLayoutChange = (layout: SearchLayout) => {
    dispatch({ type: LAYOUT_CHANGE, payload: layout });
    updateLocationQuery({ layout });
  };

  return {
    query,
    hasFilters: hasFilters(query),
    onQueryChange,
    onSortChange,
    onLayoutChange,
  };
};
