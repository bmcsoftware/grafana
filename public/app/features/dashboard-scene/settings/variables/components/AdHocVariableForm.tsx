import React from 'react';

import { DataSourceInstanceSettings } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { DataSourceRef } from '@grafana/schema';
import { Alert, Field } from '@grafana/ui';
import { t,Trans } from 'app/core/internationalization';
import { DataSourcePicker } from 'app/features/datasources/components/picker/DataSourcePicker';

import { VariableLegend } from './VariableLegend';


interface AdHocVariableFormProps {
  datasource?: DataSourceRef;
  onDataSourceChange: (dsSettings: DataSourceInstanceSettings) => void;
  infoText?: string;
}
{/*BMC Change: To enable localization for below text*/}
export function AdHocVariableForm({ datasource, infoText, onDataSourceChange }: AdHocVariableFormProps) {
  return (
    <>
      <VariableLegend><Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.ad-hoc.title">Ad-hoc options</Trans></VariableLegend>
      <Field label={t('bmcgrafana.dashboards.settings.variables.editor.types.ad-hoc.data-source-text','Data source')} htmlFor="data-source-picker">
        <DataSourcePicker current={datasource} onChange={onDataSourceChange} width={30} variables={true} noDefault />
      </Field>

      {infoText ? (
        <Alert
          title={infoText}
          severity="info"
          data-testid={selectors.pages.Dashboard.Settings.Variables.Edit.AdHocFiltersVariable.infoText}
        />
      ) : null}
    </>
  );
}
