import { backendSrv } from 'app/core/services/backend_srv';
import { useEffect } from 'react';
import { useDebounce } from 'react-use';
import { ReportsSrv } from '../../../../core/services/reports_srv';
import { FETCH_ITEMS, FETCH_ITEMS_START, FETCH_RESULTS, SEARCH_START, TOGGLE_SECTION } from '../reducers/actionTypes';
import { ReportSection, UseSearch } from '../types';

const reportsSrv = new ReportsSrv();

/**
 * Base hook for search functionality.
 * Returns state and dispatch, among others, from 'reducer' param, so it can be
 * further extended.
 * @param query
 * @param reducer - return result of useReducer
 * @param params - custom params
 */
export const useSearch: UseSearch = (query, reducer, params = {}) => {
  const { dashboard } = params;
  const [state, dispatch] = reducer;

  const search = () => {
    dispatch({ type: SEARCH_START });
    reportsSrv.getReports({ ...query, sort: query.sort?.value }, dashboard).then((results) => {
      dispatch({ type: FETCH_RESULTS, payload: results });
    });
  };

  // Set loading state before debounced search
  useEffect(() => {
    dispatch({ type: SEARCH_START });
  }, [query.sort, query.layout]);

  useDebounce(search, 300, [query]);

  const onToggleSection = (section: ReportSection) => {
    if (!section.items.length) {
      dispatch({ type: FETCH_ITEMS_START, payload: section.id });
      backendSrv.search({ folderIds: [section.id] }).then((items) => {
        dispatch({ type: FETCH_ITEMS, payload: { section, items } });
        dispatch({ type: TOGGLE_SECTION, payload: section });
      });
    } else {
      dispatch({ type: TOGGLE_SECTION, payload: section });
    }
  };

  return { state, dispatch, onToggleSection };
};
