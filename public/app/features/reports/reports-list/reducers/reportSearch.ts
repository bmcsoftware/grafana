import { ReportSection, SearchAction } from '../types';
import { FETCH_ITEMS, FETCH_ITEMS_START, FETCH_RESULTS, SEARCH_START, TOGGLE_SECTION } from './actionTypes';

export interface ReportsSearchState {
  results: ReportSection[];
  loading: boolean;
  selectedIndex: number;
  /** Used for first time page load */
  initialLoading: boolean;
}

export const reportsSearchState: ReportsSearchState = {
  results: [],
  loading: true,
  initialLoading: true,
  selectedIndex: 0,
};

export const searchReducer = (state: ReportsSearchState, action: SearchAction) => {
  switch (action.type) {
    case SEARCH_START:
      if (!state.loading) {
        return { ...state, loading: true };
      }
      return state;
    case FETCH_RESULTS: {
      const results = action.payload;
      return { ...state, results, loading: false, initialLoading: false };
    }
    case TOGGLE_SECTION: {
      const section = action.payload;
      return {
        ...state,
        results: state.results.map((result: ReportSection) => {
          if (section['id'] === result['id']) {
            return { ...result, expanded: !result.expanded };
          }
          return result;
        }),
      };
    }
    case FETCH_ITEMS: {
      const { section, items } = action.payload;
      return {
        ...state,
        itemsFetching: false,
        results: state.results.map((result: ReportSection) => {
          if (section.id === result.id) {
            return { ...result, items, itemsFetching: false };
          }
          return result;
        }),
      };
    }
    case FETCH_ITEMS_START: {
      const id = action.payload;
      if (id) {
        return {
          ...state,
          results: state.results.map((result) => (result.id === id ? { ...result, itemsFetching: true } : result)),
        };
      }
      return state;
    }
    default:
      return state;
  }
};
