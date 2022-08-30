import { Field, RadioButtonGroup, Select } from '@grafana/ui';
import React, { FC } from 'react';
import { ReportDayItem, ReportFormFrequencyItem, ReportMonthItem, ReportTimezoneItem } from '../types';
import { ReportSettingsProps } from './ReportDistributionForm';
import { ReportSchedulerFrequencySettings } from './ReportSchedulerFrequencySettings';

interface Props extends ReportSettingsProps {
  frequencyPeriod: string;
  frequencyOptions: ReportFormFrequencyItem[];
  weekDaysOptions: ReportDayItem[];
  monthsOptions: ReportMonthItem[];
  timezonesOptions: ReportTimezoneItem[];
  currentFormValues: any;
}

export const ReportSchedulerSettings: FC<Props> = ({
  control,
  errors,
  register,
  setValue,
  getValues,
  watch,
  frequencyPeriod,
  frequencyOptions,
  weekDaysOptions,
  monthsOptions,
  timezonesOptions,
  currentFormValues,
}) => {
  watch(['timezone']);
  return (
    <>
      <Field label="Frequency">
        <RadioButtonGroup
          options={frequencyOptions}
          value={frequencyOptions.find((v) => v.value === getValues().period)?.value}
          onChange={(value) => {
            setValue('period', value);
          }}
          fullWidth
        />
      </Field>
      <ReportSchedulerFrequencySettings
        register={register}
        errors={errors}
        control={control}
        frequencyPeriod={frequencyPeriod}
        weekDaysOptions={weekDaysOptions}
        monthsOptions={monthsOptions}
        currentFormValues={currentFormValues}
        setValue={setValue}
        watch={watch}
        getValues={getValues}
      />
      <Field label="Timezone">
        <Select
          options={timezonesOptions}
          value={getValues().timezone.value}
          onChange={(option: any) => {
            setValue('timezone', option);
          }}
        />
      </Field>
    </>
  );
};
