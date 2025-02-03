import { useCallback, useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { t } from '../../utils/i18n';
import { Select } from '../Select/Select';

export interface Props {
  onChange: (weekStart: string) => void;
  value: string;
  width?: number;
  autoFocus?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
  inputId?: string;
}

// BMC Change: Next function
const getWeekStarts = (): Array<SelectableValue<string>> => {
  return [
    { value: '', label: t('common.locale.default', 'Default') },
    { value: 'saturday', label: t('bmcgrafana.grafana-ui.weekdays.saturday', 'Saturday') },
    { value: 'sunday', label: t('bmcgrafana.grafana-ui.weekdays.sunday', 'Sunday') },
    { value: 'monday', label: t('bmcgrafana.grafana-ui.weekdays.monday', 'Monday') },
  ];
};
export type WeekStart = 'saturday' | 'sunday' | 'monday';

const isWeekStart = (value: string): value is WeekStart => {
  return ['saturday', 'sunday', 'monday'].includes(value);
};

export const getWeekStart = (value: string): WeekStart => {
  if (isWeekStart(value)) {
    return value;
  }

  return 'monday';
};

export const WeekStartPicker = (props: Props) => {
  const { onChange, width, autoFocus = false, onBlur, value, disabled = false, inputId } = props;
  // BMC Change: Next Hook
  const weekStarts = useMemo(() => {
    return getWeekStarts();
  }, []);
  const onChangeWeekStart = useCallback(
    (selectable: SelectableValue<string>) => {
      if (selectable.value !== undefined) {
        onChange(selectable.value);
      }
    },
    [onChange]
  );

  return (
    <Select
      inputId={inputId}
      value={weekStarts.find((item) => item.value === value)?.value}
      placeholder={selectors.components.WeekStartPicker.placeholder}
      autoFocus={autoFocus}
      openMenuOnFocus={true}
      width={width}
      options={weekStarts}
      onChange={onChangeWeekStart}
      onBlur={onBlur}
      disabled={disabled}
    />
  );
};
