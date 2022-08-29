import { cloneDeep } from 'lodash';

import { DatePickerVariableModel } from '../types';
import { initialDatePickerVariableModelState, DatePickerVariableReducer } from './reducer';
import { dispatch } from '../../../store/store';
import { setOptionAsCurrent } from '../state/actions';
import { VariableAdapter } from '../adapters';
import { DatePickerVariablePicker } from './DatePickerVariablePicker';
import { DatePickerVariableEditor } from './DatePickerVariableEditor';
import { setDatePickerVariableOptionsFromUrl, updateDatePickerVariableOptions } from './actions';
import { toVariableIdentifier } from '../state/types';

export const createDatePickerVariableAdapter = (): VariableAdapter<DatePickerVariableModel> => {
  return {
    id: 'datepicker',
    description: 'Define a date range variable, where users can select any date range',
    name: 'Date Range',
    initialState: initialDatePickerVariableModelState,
    reducer: DatePickerVariableReducer,
    picker: DatePickerVariablePicker,
    editor: DatePickerVariableEditor,
    dependsOn: (variable, variableToTest) => {
      return false;
    },
    setValue: async (variable, option, emitChanges = false) => {
      await dispatch(setOptionAsCurrent(toVariableIdentifier(variable), option, emitChanges));
    },
    setValueFromUrl: async (variable, urlValue) => {
      await dispatch(setDatePickerVariableOptionsFromUrl(toVariableIdentifier(variable), urlValue));
    },
    updateOptions: async (variable) => {
      await dispatch(updateDatePickerVariableOptions(toVariableIdentifier(variable)));
    },
    getSaveModel: (variable, saveCurrentAsDefault) => {
      const { index, id, state, global, originalQuery, ...rest } = cloneDeep(variable);
      return rest;
    },
    getValueForUrl: (variable) => {
      return variable.current.value;
    },
    beforeAdding: (model) => {
      return { ...cloneDeep(model), originalQuery: model.query };
    },
  };
};
