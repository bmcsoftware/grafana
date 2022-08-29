import { Field, RadioButtonGroup } from '@grafana/ui';
import React, { FC } from 'react';
import { ReportFormLayoutItem, ReportFormThemeItem, ReportFormOrientationItem } from '../types';
import { ReportSettingsProps } from './ReportDistributionForm';

interface Props extends ReportSettingsProps {
  orientationOptions: ReportFormOrientationItem[];
  layoutOptions: ReportFormLayoutItem[];
  themeOptions: ReportFormThemeItem[];
}

export const ReportOptions: FC<Props> = ({ register, getValues, setValue, orientationOptions, layoutOptions }) => {
  const pdfLayoutDesc = `Grid - Shows panels in the positions they appear on the dashboard. Simple - Shows one panel per row on the page.`;
  return (
    <>
      <Field label="Orientation">
        <RadioButtonGroup
          options={orientationOptions}
          value={orientationOptions.find((v) => v.value === getValues().orientation)?.value}
          onChange={(value) => {
            setValue('orientation', value);
          }}
          fullWidth
        />
      </Field>
      <Field label="Layout" description={pdfLayoutDesc}>
        <RadioButtonGroup
          options={layoutOptions}
          value={layoutOptions.find((v) => v.value === getValues().layout)?.value}
          onChange={(value) => {
            setValue('layout', value);
          }}
          fullWidth
        />
      </Field>
      {/* <Field label="Theme">
        <InputControl name="theme" control={control} options={themeOptions} as={RadioButtonGroup} />
      </Field> */}
    </>
  );
};
