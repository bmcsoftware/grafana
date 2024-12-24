import { t } from 'i18next';
import React, { useCallback, useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import { useSelector } from 'app/types';

import { getLastKey, getVariablesByKey } from '../../../variables/state/selectors';

export interface Props {
  id?: string;
  repeat?: string;
  onChange: (name?: string) => void;
}

export const RepeatRowSelect = ({ repeat, onChange, id }: Props) => {
  const variables = useSelector((state) => {
    return getVariablesByKey(getLastKey(state), state);
  });

  const variableOptions = useMemo(() => {
    const options: Array<SelectableValue<string | null>> = variables.map((item) => {
      return { label: item.name, value: item.name };
    });
    if (options.length === 0) {
      options.unshift({
        // BMC Change: To enable localization for below text
        label: t(
          'bmcgrafana.dashboards.edit-panel.panel-options.repeat-options.no-template-variables-found',
          'No template variables found'
        ),
        // BMC Change ends
        value: null,
      });
    }

    options.unshift({
      // BMC Change: To enable localization for below text
      label: t('bmcgrafana.dashboards.edit-panel.panel-options.repeat-options.disable-repeating', 'Disable repeating'),
      // BMC Change ends
      value: null,
    });

    return options;
  }, [variables]);

  const onSelectChange = useCallback((option: SelectableValue<string | null>) => onChange(option.value!), [onChange]);

  return <Select inputId={id} value={repeat} onChange={onSelectChange} options={variableOptions} />;
};
