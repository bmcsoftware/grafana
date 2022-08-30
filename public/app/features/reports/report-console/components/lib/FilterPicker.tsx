import { SelectableValue } from '@grafana/data';
import { MultiSelect, Tooltip } from '@grafana/ui';
import React, { FC } from 'react';

export type RepType = 'pdf' | 'csv' | 'xls';

export interface Props {
  values: RepType[];
  onChange: (_?: RepType[]) => void;
}

export const FilterPicker: FC<Props> = ({ onChange, values }) => {
  const options: Array<SelectableValue<RepType>> = [
    { label: 'PDF', value: 'pdf', icon: 'fa fa-file-pdf-o' },
    { label: 'XLS', value: 'xls', icon: 'fa fa-file-excel-o' },
    { label: 'CSV', value: 'csv', icon: 'fa fa-file-text-o' },
  ];

  return (
    <MultiSelect
      menuShouldPortal
      isClearable
      closeMenuOnSelect={false}
      placeholder="Filter"
      options={options}
      value={values}
      onChange={(items) => {
        const values = items.map((item) => item.value!);
        if (values.length === 0) {
          onChange(undefined);
        } else {
          onChange(values);
        }
      }}
      prefix={
        <Tooltip content={'Filter report by type'}>
          <i className="fa fa-filter" />
        </Tooltip>
      }
    />
  );
};
