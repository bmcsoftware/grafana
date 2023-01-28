import React, { FC, useEffect, useState } from 'react';
import { useAsync } from 'react-use';

import { SelectableValue } from '@grafana/data';
import { Icon, Select } from '@grafana/ui';

import { calcFieldsSrv } from '../../../../core/services/calcFields_srv';
import { DEFAULT_SORT } from '../../constants';
import { typeMap } from '../../types';

export interface Props {
  onChange: (sortValue: SelectableValue) => void;
  value?: SelectableValue | null;
  placeholder?: string;
}

const getSortOptions = () => {
  return calcFieldsSrv.getSortOptions().then(({ sortOptions }) => {
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
interface FilterPickerProps {
  onChange: (selectedVal: SelectableValue) => void;
  options: string[];
  value?: string;
}
export const TypePicker: FC<FilterPickerProps> = ({ onChange, options, value }) => {
  const [filterOptions, setFilterOptions] = useState<SelectableValue[]>();
  useEffect(() => {
    const optArr: SelectableValue[] = [{ label: 'All', value: 'All' }];
    options.map((item: string) => optArr.push({ label: typeMap[item], value: item }));
    setFilterOptions(optArr);
  }, [options]);

  return filterOptions?.length ? (
    <Select
      width={30}
      onChange={onChange}
      value={filterOptions?.filter((opt) => opt.value === value)}
      options={filterOptions}
      placeholder={'Filter by type (Default All)'}
      prefix={<Icon name="filter" />}
    />
  ) : null;
};
