import { SearchAction } from '../types';
import { mergeReducers } from '../utils';
import { TOGGLE_ALL_CHECKED, TOGGLE_CHECKED } from './actionTypes';
import { reportsSearchState, ReportsSearchState, searchReducer } from './reportSearch';

export interface ManageReportsState extends ReportsSearchState {
  allChecked: boolean;
}

export const manageReportsState: ManageReportsState = {
  ...reportsSearchState,
  allChecked: false,
};

const reducer = (state: ManageReportsState, action: SearchAction) => {
  switch (action.type) {
    case TOGGLE_ALL_CHECKED:
      const newAllChecked = !state.allChecked;
      return {
        ...state,
        results: state.results.map((result) => {
          return {
            ...result,
            checked: newAllChecked,
            items: result.items.map((item) => ({ ...item, checked: newAllChecked })),
          };
        }),
        allChecked: newAllChecked,
      };
    case TOGGLE_CHECKED:
      const { id, type } = action.payload;
      const updatedResults = state.results.map((result) => {
        if (result.id === id && result.type === type) {
          return {
            ...result,
            checked: !result.checked,
            items: result.items.map((item) => ({ ...item, checked: !result.checked })),
          };
        }
        const updatedItems = result.items.map((item) =>
          item.id === id && item.type === type ? { ...item, checked: !item.checked } : item
        );
        return {
          ...result,
          items: updatedItems,
          checked: updatedItems.filter((item) => !item.checked).length === 0 ? true : false,
        };
      });
      return {
        ...state,
        results: updatedResults,
        allChecked: updatedResults.filter((item) => !item.checked).length === 0 ? true : false,
      };
    default:
      return state;
  }
};

export const manageReportsReducer = mergeReducers([searchReducer, reducer]);
