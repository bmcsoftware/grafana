import { Field, Input, Select } from '@grafana/ui';
import React, { FC } from 'react';
import { ReportDayItem, ReportMonthItem } from '../types';
import { ReportSettingsProps } from './ReportDistributionForm';

interface Props extends ReportSettingsProps {
  weekDaysOptions: ReportDayItem[];
  monthsOptions: ReportMonthItem[];
  currentFormValues: any;
  frequencyPeriod: string;
}

export const ReportSchedulerFrequencySettings: FC<Props> = ({
  errors,
  register,
  getValues,
  setValue,
  weekDaysOptions,
  monthsOptions,
  currentFormValues,
  frequencyPeriod,
}) => {
  const period = currentFormValues.period || frequencyPeriod;

  const isInRange = (value: number, maxValue: number, minValue: number) => {
    return value >= minValue && value <= maxValue;
  };

  const isNumeric = (value: string) => {
    return /^-?\d+$/.test(value);
  };

  const validateNumbersInputsFormat = (minValue: number, maxValue: number, value: string) => {
    if (value === '') {
      return true;
    }
    const isInvalid = value
      .replace(/\s/g, '')
      .split(',')
      .some((item) => {
        if (item.includes('-')) {
          const rangItems = item.split('-');
          if (
            rangItems.length !== 2 ||
            !isNumeric(rangItems[0]) ||
            !isInRange(+rangItems[0], maxValue, minValue) ||
            !isNumeric(rangItems[1]) ||
            !isInRange(+rangItems[1], maxValue, minValue) ||
            +rangItems[0] >= +rangItems[1]
          ) {
            return true;
          } else {
            return false;
          }
        } else {
          return !isNumeric(item) || !isInRange(+item, maxValue, minValue);
        }
      });
    return !isInvalid;
  };

  return (
    <>
      {period === 'year' && (
        <Field label="Months">
          <Select
            {...register('months')}
            isMulti={true}
            options={monthsOptions}
            value={getValues().months}
            placeholder={'Every month of the year'}
            onChange={(option: any) => {
              setValue('months', option);
            }}
            onBlur={() => {}}
          />
        </Field>
      )}
      {(period === 'year' || period === 'month') && (
        <Field
          label="Month days (example: 1,3,5,20-27)"
          invalid={!!errors.monthDays}
          error={errors.monthDays && 'Invalid input format'}
        >
          <Input
            {...register('monthDays', {
              required: false,
              validate: (value) => validateNumbersInputsFormat(1, 31, value),
            })}
            placeholder={getValues()['weekDays']?.length > 0 ? '' : 'Every day of the month'}
          />
        </Field>
      )}
      {(period === 'year' || period === 'month' || period === 'week') && (
        <Field label="Week days">
          <Select
            isMulti={true}
            options={weekDaysOptions}
            value={getValues().weekDays}
            placeholder={getValues()['monthDays']?.length > 0 ? '' : 'Every day of the week'}
            onChange={(option: any) => {
              setValue('weekDays', option);
            }}
            onBlur={() => {}}
          />
        </Field>
      )}
      {period !== 'hour' && (
        <Field
          label="At hours (example: 1,5,20-23)"
          invalid={!!errors.hours}
          error={errors.hours && 'Invalid input format'}
        >
          <Input
            placeholder={'Every hour'}
            {...register('hours', {
              required: false,
              validate: (value) => validateNumbersInputsFormat(0, 23, value),
            })}
          />
        </Field>
      )}
      <Field
        label="At minute (valid values are 0-59)"
        invalid={!!errors.minutes}
        error={errors.minutes && errors.minutes.message}
      >
        <Input
          width={10}
          {...register('minutes', {
            required: `Time format is invalid. Required format is 'mm', and valid values are 0-59`,
            pattern: {
              value: /^[0-5]?[0-9]$/,
              message: `Time format is invalid. Required format is 'mm', and valid values are 0-59`,
            },
          })}
        />
      </Field>
    </>
  );
};
