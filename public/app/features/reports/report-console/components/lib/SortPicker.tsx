import { SelectableValue } from '@grafana/data';
import { Icon, Select } from '@grafana/ui';
import React, { FC } from 'react';

export type AlphaSort = 'alpha-asc' | 'alpha-desc';

export interface Props {
  value?: AlphaSort;
  onChange: (_?: AlphaSort) => void;
}

export const SortPicker: FC<Props> = ({ onChange, value }) => {
  const options: Array<SelectableValue<AlphaSort>> = [
    { label: 'Alphabetically (A-Z)', value: 'alpha-asc', icon: 'sort-amount-down' },
    { label: 'Alphabetically (Z-A)', value: 'alpha-desc', icon: 'sort-amount-up' },
  ];

  const selected = options.find((e: SelectableValue<AlphaSort>) => e.value === value);

  return (
    <Select
      value={value}
      onChange={({ value }) => onChange(value)}
      options={options}
      placeholder={`Sort (${selected?.label ?? 'Default A-Z'})`}
      prefix={<Icon name={(selected?.icon as any) ?? 'sort-amount-down'} />}
    />
  );
};
