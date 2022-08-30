import { SelectableValue } from '@grafana/data';
import { Icon, Select } from '@grafana/ui';
import React, { FC } from 'react';
import { useAsync } from 'react-use';
import { ReportsSrv } from '../../../../core/services/reports_srv';
import { DEFAULT_SORT } from '../constants';

const reportSrv = new ReportsSrv();

export interface Props {
  onChange: (sortValue: SelectableValue) => void;
  value?: SelectableValue | null;
  placeholder?: string;
}

const getSortOptions = () => {
  return reportSrv.getSortOptions().then(({ sortOptions }) => {
    return sortOptions.map((opt: any) => ({ label: opt.displayName, value: opt.name }));
  });
};

export const SortPicker: FC<Props> = ({ onChange, value, placeholder }) => {
  // Using sync Select and manual options fetching here since we need to find the selected option by value

  const { loading, value: options } = useAsync(getSortOptions, []);

  return !loading ? (
    <Select
      width={25}
      onChange={onChange}
      value={options?.filter((opt) => opt.value === value)}
      options={options}
      placeholder={placeholder ?? `Sort (Default ${DEFAULT_SORT.label})`}
      prefix={<Icon name="sort-amount-down" />}
    />
  ) : null;
};
