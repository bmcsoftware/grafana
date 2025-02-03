import { FormEvent } from 'react';

import { SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t, Trans } from 'app/core/internationalization';

import { SelectionOptionsForm } from './SelectionOptionsForm';
import { VariableLegend } from './VariableLegend';
import { VariableSelectField } from './VariableSelectField';
import { VariableTextField } from './VariableTextField';

interface DataSourceVariableFormProps {
  query: string;
  regex: string;
  multi: boolean;
  allValue?: string | null;
  includeAll: boolean;
  onChange: (option: SelectableValue) => void;
  optionTypes: Array<{ value: string; label: string }>;
  onRegExBlur: (event: FormEvent<HTMLInputElement>) => void;
  onMultiChange: (event: FormEvent<HTMLInputElement>) => void;
  onIncludeAllChange: (event: FormEvent<HTMLInputElement>) => void;
  onAllValueChange: (event: FormEvent<HTMLInputElement>) => void;
  onQueryBlur?: (event: FormEvent<HTMLTextAreaElement>) => void;
  onAllValueBlur?: (event: FormEvent<HTMLInputElement>) => void;
}

export function DataSourceVariableForm({
  query,
  regex,
  optionTypes,
  onChange,
  onRegExBlur,
  multi,
  includeAll,
  allValue,
  onMultiChange,
  onIncludeAllChange,
  onAllValueChange,
}: DataSourceVariableFormProps) {
  const typeValue = optionTypes.find((o) => o.value === query) ?? optionTypes[0];

  return (
    <>
      <VariableLegend>
        <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.data-source.title">
          Data source options
        </Trans>
      </VariableLegend>
      <VariableSelectField
        name={t('bmcgrafana.dashboards.settings.variables.editor.types.data-source.type', 'Type')}
        value={typeValue}
        options={optionTypes}
        onChange={onChange}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.DatasourceVariable.datasourceSelect}
      />

      <VariableTextField
        defaultValue={regex}
        name={t(
          'bmcgrafana.dashboards.settings.variables.editor.types.data-source.name-filter',
          'Instance name filter'
        )}
        placeholder="/.*-(.*)-.*/"
        onBlur={onRegExBlur}
        description={
          <div>
            <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.data-source.name-filter-desc1">
              Regex filter for which data source instances to choose from in the variable value list. Leave empty for
              all.
            </Trans>
            <br />
            <br />
            <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.data-source.name-filter-desc2">
              Example:{' '}
            </Trans>
            <code>/^prod/</code>
          </div>
        }
      />

      <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.selection-options">Selection options</Trans>
      <SelectionOptionsForm
        multi={multi}
        includeAll={includeAll}
        allValue={allValue}
        onMultiChange={onMultiChange}
        onIncludeAllChange={onIncludeAllChange}
        onAllValueChange={onAllValueChange}
      />
    </>
  );
}
