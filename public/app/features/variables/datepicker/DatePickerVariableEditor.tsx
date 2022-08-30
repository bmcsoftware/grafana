import React, { ReactElement, useCallback, useEffect } from 'react';
import { VerticalGroup, TimeRangeInput } from '@grafana/ui';
import { DatePickerVariableModel } from '../types';
import { VariableEditorProps } from '../editor/types';
import { VariableSectionHeader } from '../editor/VariableSectionHeader';
import { TimeRange } from '@grafana/data';
import { getDefaultTimeRange, convertQuery2TimeRange, convertTimeRange2Query } from './utils';
import { css } from '@emotion/css';
import { connect, ConnectedProps } from 'react-redux';
import { StoreState } from 'app/types';

const mapStateToProps = (state: StoreState) => ({
  dashboard: state.dashboard.getModel(),
});

interface OwnProps extends VariableEditorProps<DatePickerVariableModel> {}
const connector = connect(mapStateToProps, {});
type connectedProps = ConnectedProps<typeof connector>;
type Props = OwnProps & connectedProps;

const DatePickerVariableEditorUnconnected = (props: Props): ReactElement => {
  const {
    onPropChange,
    variable: { query },
    dashboard,
  } = props;
  useEffect(() => {
    if (!query) {
      onPropChange({ propName: 'query', propValue: convertTimeRange2Query(), updateOptions: true });
    }
  }, []);
  const updateVariable = useCallback(
    (val: TimeRange, updateOptions: boolean) => {
      onPropChange({ propName: 'query', propValue: convertTimeRange2Query(val), updateOptions });
    },
    [onPropChange]
  );
  const onChange = useCallback((val: TimeRange) => updateVariable(val, true), [updateVariable]);

  let timeRange: TimeRange;
  if (query) {
    timeRange = convertQuery2TimeRange(query, dashboard?.getTimezone());
  } else {
    timeRange = getDefaultTimeRange();
  }

  return (
    <VerticalGroup spacing="xs">
      <VariableSectionHeader name="Select Time Range" />
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
          value={timeRange}
          timeZone={dashboard?.getTimezone() ?? 'browser'}
          onChange={onChange}
          onChangeTimeZone={(tz: any) => console.log('timezone', tz)}
          hideQuickRanges={true}
        />
      </div>
    </VerticalGroup>
  );
};

export const DatePickerVariableEditor = connector(DatePickerVariableEditorUnconnected);
