import { GrafanaTheme2 } from '@grafana/data';
import { config } from 'app/core/config';
import { CollapsableSection, Field, Input, RadioButtonGroup, Select, stylesFactory, useTheme2 } from '@grafana/ui';
import { css } from 'emotion';
import { Jodit } from 'jodit';
import JoditEditor from 'jodit-react';
import queryString from 'querystring';
import React, { FC, useState, useEffect } from 'react';
import { messageEditorConfig, subjectEditorConfig } from '../../jodit-editor/configs';
import { reportTypeOptions as DefaultReportTypes } from '../utils';
import {
  ReportDashboardItem,
  ReportFilterItem,
  ReportFormTypeItem,
  ReportRecipientItem,
  ReportTimeRangeItem,
  ReportType,
} from '../types';
import { ReportSettingsProps } from './ReportDistributionForm';
import { MultiSelectRecipients } from './widgets/MultiSelectRecipients';

interface Props extends ReportSettingsProps {
  canChangeDashboard: boolean;
  dashboardsOptions: ReportDashboardItem[];
  reportTypeOptions: ReportFormTypeItem[];
  dashboardFilters: ReportFilterItem[];
  timeRangeOptions: ReportTimeRangeItem[];
  filterOptions: ReportFilterItem[];
  recipientsOptions: ReportRecipientItem[];
  onDashboardChange: (uid: string, callback: (filters: any, reportTypes: any) => void) => void;
}

var filtersOption: ReportFilterItem[] = [];

export const ReportBasicSettings: FC<Props> = ({
  errors,
  control,
  register,
  setValue,
  getValues,
  recipientsOptions,
  canChangeDashboard,
  reportTypeOptions,
  dashboardsOptions,
  dashboardFilters,
  timeRangeOptions,
  filterOptions,
  onDashboardChange,
}) => {
  const styles = getStyles(useTheme2());

  const timeRangeDesc = `Generate report with the form specified time range. If custom time range is 'Default', the time range from the report's dashboards is used.`;
  const filtersDesc = `Generate report with the form specified dashboard variables. If filtering is set to 'Default', the report will use the saved dashboard variables, If set to custom it will use the current session dashboard variables.`;

  const [state, setState] = useState({
    variables: dashboardFilters,
    isSet: false,
  });

  const [reportTypes, setReportTypes] = useState<ReportFormTypeItem[]>([]);

  if (filtersOption.length === 0) {
    filtersOption = [...filterOptions];
    var sessionFilter = sessionStorage.getItem('reportFilter');
    if (sessionFilter && sessionFilter !== '') {
      filtersOption.push({
        label: 'Use current variables',
        value: sessionFilter,
        description: 'The recent selected variables of the dashboard',
      });
    }
    if (getValues().filter && getValues().filter.value !== '') {
      filtersOption.push({
        label: 'Use saved variables',
        value: getValues().filter.value,
        description: 'The already saved variables in the report',
      });
    }
  }

  if (dashboardFilters.length !== 0 && !state.isSet) {
    setState({ ...state, variables: dashboardFilters, isSet: true });
  }

  useEffect(() => {
    const availableReportTypeOptions = reportTypeOptions.length === 0 ? DefaultReportTypes : reportTypeOptions;
    const currentSelection = getValues().reportType;
    const hasType = availableReportTypeOptions.map((e) => e.value.toString()).includes(currentSelection);
    if (!hasType) {
      setValue('reportType', availableReportTypeOptions[0].value);
    }
    setReportTypes(availableReportTypeOptions);
  }, [reportTypeOptions, getValues, setValue]);

  const reportTypeDescription =
    getValues().reportType === ReportType.CSV
      ? `CSV report for only table panels from a selected dashboard will be generated.`
      : getValues().reportType === ReportType.XLS
      ? ''
      : '';

  return (
    <>
      <Field label="Name" invalid={!!errors.name} error={errors.name && errors.name.message}>
        <Input
          maxLength={60}
          {...register('name', {
            required: 'Report name is required',
            validate: (value: any) => {
              const isValid = new RegExp(/^[\w-\. _(){}\[\]\%\=\/`\'\"]+$/).test(value);
              return isValid;
            },
          })}
        />
      </Field>
      <Field label="Description (optional)">
        <Input
          maxLength={256}
          {...register('description', {
            required: false,
          })}
        />
      </Field>
      <Field label="Dashboard" invalid={!!errors.dashboard} disabled={canChangeDashboard} error="Dashboard is required">
        <Select
          isSearchable={true}
          onChange={(option: any) => {
            setValue('dashboard', option);
            onDashboardChange(option.uid, (variables: any, reportTypes: ReportFormTypeItem[]) => {
              setReportTypes(reportTypes);
              const currentSelection = getValues().reportType;
              const hasType = reportTypes.map((e) => e.value.toString()).includes(currentSelection);
              if (!hasType) {
                setValue('reportType', reportTypes[0].value);
              }
              setState({ ...state, variables, isSet: true });
            });
          }}
          value={dashboardsOptions.find((item) => item.value === getValues().dashboard?.value)?.value}
          options={dashboardsOptions}
        />
      </Field>
      <Field label="Type" invalid={!!errors.reportType} description={reportTypeDescription}>
        <RadioButtonGroup
          onChange={(value) => {
            setValue('reportType', value.toString());
          }}
          value={getValues('reportType')}
          options={reportTypes}
          fullWidth
        />
      </Field>
      <div className={styles.formItem}>
        <CollapsableSection label={'Mail Settings'} isOpen={true}>
          <MultiSelectRecipients
            control={control}
            errors={errors}
            initialValues={recipientsOptions}
            selected={getValues().recipients}
            onSelect={(recipients) => {
              setValue('recipients', recipients);
            }}
          />
          <Field label="Subject">
            <JoditEditor
              key="subject"
              config={subjectEditorConfig(Jodit.defaultOptions, state.variables)}
              value={getValues().subject}
              onChange={(value: any) => {
                setValue('subject', value);
              }}
            />
          </Field>
          <Field label="Custom message">
            <JoditEditor
              config={messageEditorConfig(Jodit.defaultOptions, state.variables)}
              value={getValues().message}
              onChange={(value: any) => {
                setValue('message', value);
              }}
            />
          </Field>
        </CollapsableSection>
      </div>
      <div className={styles.formItem}>
        <CollapsableSection label={'Report Options'} isOpen={true}>
          <Field label="Time range" description={timeRangeDesc}>
            <Select
              options={timeRangeOptions}
              value={getValues().timeRange.value}
              onChange={(option: any) => {
                setValue('timeRange', option);
              }}
            />
          </Field>
          <Field label="Dashboard variables" description={filtersDesc}>
            <Select
              options={filtersOption}
              value={getValues().filter.value}
              onChange={(option: any) => {
                setValue('filter', option);
              }}
            />
          </Field>
          <Field>
            <div className={styles.pinWrapper}>
              {getValues().filter !== undefined && getValues().filter.value !== '' ? (
                <div style={{ display: 'grid' }}>
                  {Object.keys(queryString.parse(getValues().filter.value) as any).map((key, i) => {
                    const values = queryString.parse(getValues().filter.value)[key].toString();
                    return values === '' ? (
                      <div></div>
                    ) : (
                      <code className={styles.pins} key={key + i}>
                        <b>{key.replace('var-', '').toLocaleUpperCase()}</b> : {values}
                      </code>
                    );
                  })}
                </div>
              ) : (
                <div></div>
              )}
            </div>
          </Field>
        </CollapsableSection>
      </div>
    </>
  );
};

const { theme } = config;
if (theme.isDark) {
  require('../../jodit-editor/rich-text-editor-theme.css');
}

const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    pinWrapper: css`
      display: flex;
      flex-wrap: wrap;
    `,
    formItem: css`
      flex-grow: 1;
      padding-top: ${theme.v1.spacing.md};
    `,
    pins: css`
      background: ${theme.v1.colors.pageHeaderBg};
      border-radius: 2px;
      padding: 2px 4px;
      margin: 2px;
      cursor: default;
      display: block;
      white-space: break-spaces;
      line-break: anywhere;
      font-family: 'Open Sans', 'Roboto';
    `,
  };
});
