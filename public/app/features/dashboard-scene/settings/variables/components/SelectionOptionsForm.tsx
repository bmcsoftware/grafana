import React, { ChangeEvent, FormEvent } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { VerticalGroup, useTheme2 } from '@grafana/ui';
import { getFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';
import { VariableCheckboxField } from 'app/features/dashboard-scene/settings/variables/components/VariableCheckboxField';
import { VariableTextField } from 'app/features/dashboard-scene/settings/variables/components/VariableTextField';

interface SelectionOptionsFormProps {
  multi: boolean;
  includeAll: boolean;
  allValue?: string | null;
  onMultiChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onIncludeAllChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAllValueChange: (event: FormEvent<HTMLInputElement>) => void;
  // BMC change: Below all props
  onIncludeOnlyAvailable?: (event: ChangeEvent<HTMLInputElement>) => void;
  query?: any;
  discardForAll?: boolean;
}

export function SelectionOptionsForm({
  multi,
  includeAll,
  allValue,
  onMultiChange,
  onIncludeAllChange,
  onAllValueChange,
  // BMC change: Below all props
  onIncludeOnlyAvailable,
  query,
  discardForAll,
}: SelectionOptionsFormProps) {
  // BMC change next line
  const theme = useTheme2();
  return (
    <VerticalGroup spacing="md" height="inherit">
      <VariableCheckboxField
        value={multi}
        name="Multi-value"
        description="Enables multiple values to be selected at the same time"
        onChange={onMultiChange}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.General.selectionOptionsMultiSwitch}
      />
      <VariableCheckboxField
        value={includeAll}
        name="Include All option"
        // BMC change inline
        description="Enables an option to include all variable values"
        onChange={onIncludeAllChange}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.General.selectionOptionsIncludeAllSwitch}
      />
      {/* BMC change starts */}
      {(query?.startsWith?.('remedy') || (query as any)?.sourceType === 'remedy') &&
        includeAll &&
        onIncludeOnlyAvailable &&
        (getFeatureStatus('bhd-ar-all-values') || getFeatureStatus('bhd-ar-all-values-v2')) && (
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: `${theme.typography.size.lg}` }}>
            <VariableCheckboxField
              value={discardForAll === undefined ? getDefaultValueForDiscard() : discardForAll}
              name="Exclude variable"
              description="Select to exclude the variable from the query"
              onChange={onIncludeOnlyAvailable}
            />
          </div>
        )}
      {/* BMC change Ends */}
      {includeAll && (
        <VariableTextField
          defaultValue={allValue ?? ''}
          onBlur={onAllValueChange}
          name="Custom all value"
          placeholder="blank = auto"
          testId={selectors.pages.Dashboard.Settings.Variables.Edit.General.selectionOptionsCustomAllInput}
        />
      )}
    </VerticalGroup>
  );
}

const getDefaultValueForDiscard = (): boolean => {
  return getFeatureStatus('bhd-ar-all-values-v2') ? false : true;
};
