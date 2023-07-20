import { css } from '@emotion/css';
import React, { ReactElement, useState, useEffect, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { TimeRange, DatePickerVariableModel } from '@grafana/data';
import { TimeRangeInput } from '@grafana/ui';
import { useDispatch, StoreState } from 'app/types';

import { variableAdapters } from '../adapters';
import { VariablePickerProps } from '../pickers/types';
import { toKeyedAction } from '../state/keyedVariablesReducer';
import { changeVariableProp } from '../state/sharedReducer';
import { toVariablePayload } from '../utils';

import { convertQuery2TimeRange, convertTimeRange2Query } from './utils';

const mapStateToProps = (state: StoreState) => ({
  dashboard: state.dashboard.getModel(),
});
const connector = connect(mapStateToProps, {});
interface OwnProps extends VariablePickerProps<DatePickerVariableModel> {}
type Props = OwnProps & ConnectedProps<typeof connector>;
const DatePickerVariablePickerUnconnected = ({ variable, onVariableChange, dashboard }: Props): ReactElement => {
  const dispatch = useDispatch();
  const [updatedValue, setUpdatedValue] = useState<TimeRange>(
    convertQuery2TimeRange(variable.current.value, dashboard?.getTimezone())
  );
  useEffect(() => {
    const timeRange: TimeRange = convertQuery2TimeRange(variable.current.value, dashboard?.getTimezone());
    setUpdatedValue(timeRange);
  }, [variable, dashboard]);

  const updateVariable = useCallback(
    (val: TimeRange) => {
      if (!variable.rootStateKey) {
        console.error('Cannot update variable without rootStateKey');
        return;
      }

      const updatedVal = convertTimeRange2Query(val);
      if (variable.current.value === updatedVal) {
        return;
      }

      dispatch(
        toKeyedAction(
          variable.rootStateKey,
          changeVariableProp(
            toVariablePayload({ id: variable.id, type: variable.type }, { propName: 'query', propValue: updatedVal })
          )
        )
      );

      if (onVariableChange) {
        onVariableChange({
          ...variable,
          current: { ...variable.current, value: updatedVal },
        });
        return;
      }

      variableAdapters.get(variable.type).updateOptions(variable);
    },
    [variable, dispatch, onVariableChange]
  );

  const onChange = useCallback(
    (val: TimeRange) => {
      updateVariable(val);
    },
    [updateVariable]
  );

  return (
    <div
      className={css`
        div.override {
          width: 262px !important;
          .override {
            left: 262px !important;
          }
        }
      `}
    >
      <TimeRangeInput
        value={updatedValue}
        timeZone={dashboard?.getTimezone() ?? 'broswer'}
        onChange={onChange}
        onChangeTimeZone={(tz: any) => console.log('timezone', tz)}
        hideQuickRanges={true}
      />
    </div>
  );
};

export const DatePickerVariablePicker = connector(DatePickerVariablePickerUnconnected);
