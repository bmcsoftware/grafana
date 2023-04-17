import { css } from '@emotion/css';
import React, { FC, memo, useEffect, useState } from 'react';

import { GrafanaTheme, SelectableValue } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { Spinner, stylesFactory, useTheme, Field, Input, Select, CallToActionCard, Switch, Button } from '@grafana/ui';

import { ModifyActions } from '../../types';
import { isSaveEnabled } from '../../utils';
import { useModifyFields } from '../hooks/useModifyFields';

import { RawQueryEditor } from './RawQueryEditor';

export interface Props {
  action: string;
  uid?: string;
}

export const FieldsForm: FC<Props> = memo(({ action, uid }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const {
    forms,
    modules,
    columns,
    fields,
    loading,
    errMsg,
    onFormChange,
    onModuleChange,
    onNameChange,
    onQueryChange,
    toggleAgg,
    validateRawQuery,
    createField,
    updateField,
  } = useModifyFields(action, uid);

  const [formOptions, setFormOptions] = useState<SelectableValue[]>([]);
  useEffect(() => {
    const options: SelectableValue[] = [];
    forms.map((item: string) => {
      options.push({ label: item, value: item });
    });
    setFormOptions(options);
  }, [forms]);
  const [moduleOptions, setModuleOptions] = useState<SelectableValue[]>([]);
  useEffect(() => {
    const options: SelectableValue[] = [];
    modules.map((item: string) => {
      options.push({ label: item, value: item });
    });
    setModuleOptions(options);
  }, [modules]);
  if (errMsg) {
    return <CallToActionCard className={styles.ctaStyle} message={errMsg} callToActionElement={<></>} />;
  }

  if (loading) {
    return <Spinner className={styles.spinner} />;
  }

  const isEditCalcField = action === ModifyActions.EDIT;

  return (
    <div className={styles.container}>
      <h2 className="page-sub-heading">{isEditCalcField ? 'Edit Calculated Field' : 'New Calculated Field'}</h2>
      <div className={styles.formContainer}>
        <Field label="Name" required={true} disabled={isEditCalcField}>
          <Input
            id="field-name"
            value={fields.name}
            onChange={onNameChange}
            placeholder={'Enter the name of the calculated field'}
          />
        </Field>
        <Field label="Form name" required={true} disabled={isEditCalcField}>
          <Select
            options={formOptions}
            onChange={onFormChange}
            value={fields.formName && { label: fields.formName, value: fields.formName }}
            placeholder={'Select form'}
          />
        </Field>
        <Field label="Module name" required={true}>
          <Select
            options={moduleOptions}
            onChange={onModuleChange}
            value={fields.module && { label: fields.module, value: fields.module }}
            placeholder={'Select module'}
            allowCustomValue={true}
          />
        </Field>
        <RawQueryEditor
          query={fields.sqlQuery}
          columns={columns}
          formName={fields.formName}
          onQueryChange={onQueryChange}
          queryValidated={fields.rawQueryValidated}
          validateRawQuery={validateRawQuery}
        />
        <Field
          label="Is aggregate"
          description="Enable this option if your query includes aggregation functions."
          horizontal
          disabled={isEditCalcField}
        >
          <Switch checked={fields.Aggregation} onChange={toggleAgg} />
        </Field>
        <div
          className={css`
            display: flex;
            justify-content: start;
            margin-top: 15px;
          `}
        >
          <Button
            size="md"
            style={{ marginRight: '15px' }}
            fill="solid"
            disabled={!isSaveEnabled(fields)}
            onClick={isEditCalcField ? updateField : createField}
          >
            {isEditCalcField ? 'Update' : 'Save'}
          </Button>
          <Button
            size="md"
            variant="secondary"
            fill="solid"
            onClick={() => {
              locationService.push({ pathname: '/calculated-fields' });
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
});

FieldsForm.displayName = 'FieldsForm';

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    container: css`
      height: 100%;
    `,
    formContainer: css`
      max-width: 600px;
    `,
    results: css`
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      padding-top: ${theme.spacing.xl};
    `,
    spinner: css`
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    `,
    ctaStyle: css`
      text-align: center;
    `,
  };
});
