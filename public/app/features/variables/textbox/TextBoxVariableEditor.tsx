import React, { FormEvent, ReactElement, useCallback } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { t, Trans } from 'app/core/internationalization';

import { VariableLegend } from '../../dashboard-scene/settings/variables/components/VariableLegend';
import { VariableTextField } from '../../dashboard-scene/settings/variables/components/VariableTextField';
import { VariableEditorProps } from '../editor/types';
import { TextBoxVariableModel } from '../types';

export interface Props extends VariableEditorProps<TextBoxVariableModel> {}

export function TextBoxVariableEditor({ onPropChange, variable: { query } }: Props): ReactElement {
  const updateVariable = useCallback(
    (event: FormEvent<HTMLInputElement>, updateOptions: boolean) => {
      event.preventDefault();
      onPropChange({ propName: 'originalQuery', propValue: event.currentTarget.value, updateOptions: false });
      onPropChange({ propName: 'query', propValue: event.currentTarget.value, updateOptions });
    },
    [onPropChange]
  );

  const onChange = useCallback((e: FormEvent<HTMLInputElement>) => updateVariable(e, false), [updateVariable]);
  const onBlur = useCallback((e: FormEvent<HTMLInputElement>) => updateVariable(e, true), [updateVariable]);

  return (
    <>
      <VariableLegend>
        <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.text-box.title">Text options</Trans>
      </VariableLegend>
      <VariableTextField
        value={query}
        name={t('bmcgrafana.dashboards.settings.variables.editor.types.text-box.default-value', 'Default value')}
        placeholder={t(
          'bmcgrafana.dashboards.settings.variables.editor.types.text-box.placeholder',
          'default value, if any'
        )}
        onChange={onChange}
        onBlur={onBlur}
        width={30}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.TextBoxVariable.textBoxOptionsQueryInputV2}
      />
    </>
  );
}
