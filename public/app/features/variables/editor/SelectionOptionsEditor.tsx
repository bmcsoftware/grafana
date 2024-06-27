import React, { ChangeEvent, FormEvent, useCallback } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { useTheme2, VerticalGroup } from '@grafana/ui';
import { getFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';

import { KeyedVariableIdentifier } from '../state/types';
import { VariableWithMultiSupport } from '../types';
import { toKeyedVariableIdentifier } from '../utils';

import { VariableCheckboxField } from './VariableCheckboxField';
import { VariableTextField } from './VariableTextField';
import { VariableEditorProps } from './types';

export interface SelectionOptionsEditorProps<Model extends VariableWithMultiSupport = VariableWithMultiSupport>
  extends VariableEditorProps<Model> {
  onMultiChanged: (identifier: KeyedVariableIdentifier, value: boolean) => void;
}

export const SelectionOptionsEditor = ({
  onMultiChanged: onMultiChangedProps,
  onPropChange,
  variable,
}: SelectionOptionsEditorProps) => {
  // BMC change next line
  const theme = useTheme2();
  const onMultiChanged = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onMultiChangedProps(toKeyedVariableIdentifier(variable), event.target.checked);
    },
    [onMultiChangedProps, variable]
  );

  const onIncludeAllChanged = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onPropChange({ propName: 'includeAll', propValue: event.target.checked });
    },
    [onPropChange]
  );

  const onIncludeOnlyAvailable = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onPropChange({ propName: 'discardForAll', propValue: event.target.checked });
    },
    [onPropChange]
  );

  const onAllValueChanged = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      onPropChange({ propName: 'allValue', propValue: event.currentTarget.value });
    },
    [onPropChange]
  );

  return (
    <VerticalGroup spacing="md" height="inherit">
      <VariableCheckboxField
        value={variable.multi}
        name="Multi-value"
        description="Enables multiple values to be selected at the same time"
        onChange={onMultiChanged}
      />
      <VariableCheckboxField
        value={variable.includeAll}
        name="Include All option"
        // BMC change inline
        description="Enables an option to include all variable values"
        onChange={onIncludeAllChanged}
      />
      {/* BMC change starts */}
      {(variable.query.startsWith?.('remedy') || (variable.query as any)?.sourceType === 'remedy') &&
        variable.includeAll &&
        (getFeatureStatus('bhd-ar-all-values') || getFeatureStatus('bhd-ar-all-values-v2')) && (
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: `${theme.typography.size.lg}` }}>
            <VariableCheckboxField
              value={variable.discardForAll === undefined ? getDefaultValueForDiscard() : variable.discardForAll}
              name="Exclude variable"
              description="Select to exclude the variable from the query"
              onChange={onIncludeOnlyAvailable}
            />
          </div>
        )}
      {/* BMC change starts */}
      {variable.includeAll && (
        <VariableTextField
          value={variable.allValue ?? ''}
          onChange={onAllValueChanged}
          name="Custom all value"
          placeholder="blank = auto"
          testId={selectors.pages.Dashboard.Settings.Variables.Edit.General.selectionOptionsCustomAllInputV2}
        />
      )}
    </VerticalGroup>
  );
};
SelectionOptionsEditor.displayName = 'SelectionOptionsEditor';

const getDefaultValueForDiscard = (): boolean => {
  return getFeatureStatus('bhd-ar-all-values-v2') ? false : true;
};
