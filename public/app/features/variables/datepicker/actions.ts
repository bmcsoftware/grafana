import { DatePickerVariableModel } from '../types';
import { ThunkResult } from '../../../types';
import { getVariable } from '../state/selectors';
import { variableAdapters } from '../adapters';
import { createDatePickerOptions } from './reducer';
import { toVariableIdentifier, toVariablePayload, VariableIdentifier } from '../state/types';
import { setOptionFromUrl } from '../state/actions';
import { UrlQueryValue } from '@grafana/data';
import { changeVariableProp } from '../state/sharedReducer';
import { ensureStringValues } from '../utils';

export const updateDatePickerVariableOptions = (identifier: VariableIdentifier): ThunkResult<void> => {
  return async (dispatch, getState) => {
    await dispatch(createDatePickerOptions(toVariablePayload(identifier)));

    const variableInState = getVariable<DatePickerVariableModel>(identifier.id, getState());
    await variableAdapters.get(identifier.type).setValue(variableInState, variableInState.options[0], true);
  };
};

export const setDatePickerVariableOptionsFromUrl =
  (identifier: VariableIdentifier, urlValue: UrlQueryValue): ThunkResult<void> =>
  async (dispatch, getState) => {
    const variableInState = getVariable<DatePickerVariableModel>(identifier.id, getState());

    const stringUrlValue = ensureStringValues(urlValue);
    dispatch(changeVariableProp(toVariablePayload(variableInState, { propName: 'query', propValue: stringUrlValue })));

    await dispatch(setOptionFromUrl(toVariableIdentifier(variableInState), stringUrlValue));
  };
