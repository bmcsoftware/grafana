import { SelectableValue } from '@grafana/data';
import { Icon, Select, Tooltip } from '@grafana/ui';
import React, { FC } from 'react';

export type ReportState = 'success' | 'fail' | 'none';

export interface Props {
  value?: ReportState;
  onChange: (sortValue?: ReportState) => void;
}

export const StatePicker: FC<Props> = ({ onChange, value }) => {
  const options: Array<SelectableValue<ReportState>> = [
    { label: 'Success', value: 'success' },
    { label: 'Failure', value: 'fail' },
    { label: 'Pending', value: 'none' },
  ];

  return (
    <Select
      menuShouldPortal
      isClearable
      placeholder="State"
      options={options}
      value={value}
      onChange={(item) => onChange(item?.value)}
      prefix={
        <Tooltip content={'Filter report by state'}>
          <Icon name="signal" />
        </Tooltip>
      }
    />
  );
};
