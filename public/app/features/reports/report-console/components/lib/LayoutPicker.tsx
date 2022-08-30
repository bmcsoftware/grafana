import { SelectableValue } from '@grafana/data';
import { RadioButtonGroup } from '@grafana/ui';
import React, { FC } from 'react';

export type Layout = 'folder' | 'list';

export interface Props {
  defaultValue?: Layout;
  value?: Layout;
  onChange: (sortValue: Layout) => void;
}

export const LayoutPicker: FC<Props> = ({ onChange, value, defaultValue }) => {
  // Using sync select and manual options fetching here since we need to find the selected option by value
  const options: Array<SelectableValue<Layout>> = [
    { value: 'folder', icon: 'fa fa-folder-o' },
    { value: 'list', icon: 'fa fa-list' },
  ];

  return <RadioButtonGroup options={options} value={value} onChange={onChange} />;
};
