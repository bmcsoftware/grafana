import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { initialVariableModelState, DatePickerVariableModel, VariableOption } from '../types';
import { getInstanceState, VariablePayload, initialVariablesState, VariablesState } from '../state/types';

export const initialDatePickerVariableModelState: DatePickerVariableModel = {
  ...initialVariableModelState,
  type: 'datepicker',
  query: '',
  current: {} as VariableOption,
  options: [],
  originalQuery: null,
};

export const DatePickerVariableSlice = createSlice({
  name: 'templating/datepicker',
  initialState: initialVariablesState,
  reducers: {
    createDatePickerOptions: (state: VariablesState, action: PayloadAction<VariablePayload>) => {
      const instanceState = getInstanceState<DatePickerVariableModel>(state, action.payload.id);
      const option = {
        text: instanceState.query.trim(),
        value: instanceState.query.trim(),
        selected: false,
      };
      instanceState.options = [option];
      instanceState.current = option;
    },
  },
});

export const DatePickerVariableReducer = DatePickerVariableSlice.reducer;

export const { createDatePickerOptions } = DatePickerVariableSlice.actions;
