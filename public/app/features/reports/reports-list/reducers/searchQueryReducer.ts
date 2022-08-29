import { ReportQuery, RouteParams, SearchAction, SearchLayout } from '../types';
import { LAYOUT_CHANGE, QUERY_CHANGE, TOGGLE_SORT } from './actionTypes';

export const defaultQuery: ReportQuery = {
  query: '',
  sort: null,
  layout: SearchLayout.Folders,
};

export const defaultQueryParams: RouteParams = {
  sort: null,
  query: null,
  layout: null,
};

export const queryReducer = (state: ReportQuery, action: SearchAction) => {
  switch (action.type) {
    case QUERY_CHANGE:
      return { ...state, query: action.payload };
    case TOGGLE_SORT: {
      const sort = action.payload;
      return { ...state, sort };
    }
    case LAYOUT_CHANGE: {
      const layout = action.payload;
      return { ...state, layout };
    }
    default:
      return state;
  }
};
