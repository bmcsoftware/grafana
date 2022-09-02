import { GrafanaTheme } from '@grafana/data';
import { Button, CollapsableSection, FormAPI, HorizontalGroup, Spinner, stylesFactory, useTheme } from '@grafana/ui';
import { css } from 'emotion';
import React, { FC, useState, useEffect } from 'react';
import {
  ReportDashboardItem,
  ReportDayItem,
  ReportFilterItem,
  ReportFormDTO,
  ReportFormFrequencyItem,
  ReportFormLayoutItem,
  ReportFormThemeItem,
  ReportFormOrientationItem,
  ReportMonthItem,
  ReportRecipientItem,
  ReportTimeRangeItem,
  ReportTimezoneItem,
  ReportType,
  ReportFormTypeItem,
} from '../types';
import { ReportMailingDialog } from './dialogs/ReportMailingDialog';
import { ReportBasicSettings } from './ReportBasicSettings';
import { ReportOptions } from './ReportOptions';
import { ReportSchedulerSettings } from './ReportSchedulerSettings';

export interface ReportSettingsProps
  extends Omit<
    FormAPI<ReportFormDTO>,
    'formState' | 'setError' | 'clearErrors' | 'reset' | 'unregister' | 'setFocus'
  > {}

interface Props extends ReportSettingsProps {
  dashboardsOptions: ReportDashboardItem[];
  dashboardFilters: ReportFilterItem[];
  preReportTypeOptions: ReportFormTypeItem[];
  recipientsOptions: ReportRecipientItem[];
  orientationOptions: ReportFormOrientationItem[];
  layoutOptions: ReportFormLayoutItem[];
  themeOptions: ReportFormThemeItem[];
  frequencyOptions: ReportFormFrequencyItem[];
  weekDaysOptions: ReportDayItem[];
  monthsOptions: ReportMonthItem[];
  timezonesOptions: ReportTimezoneItem[];
  timeRangeOptions: ReportTimeRangeItem[];
  filterOptions: ReportFilterItem[];
  currentFormValues: any;
  onDashboardChange: (uid: string, callback: (filters: any, reportTypes: any) => void) => void;
  onTestReport: (data: ReportFormDTO, callback: () => void) => void;
  onPreviewReport: (data: ReportFormDTO, callback: () => void) => void;
  dashboardUid: string;
  isEditReport: boolean;
  defaultValues: any;
}

export const ReportDistributionForm: FC<Props> = ({
  control,
  errors,
  register,
  watch,
  getValues,
  setValue,
  onTestReport,
  onPreviewReport,
  onDashboardChange,
  orientationOptions,
  layoutOptions,
  themeOptions,
  dashboardsOptions,
  dashboardFilters,
  preReportTypeOptions,
  recipientsOptions,
  frequencyOptions,
  weekDaysOptions,
  monthsOptions,
  timezonesOptions,
  timeRangeOptions,
  filterOptions,
  currentFormValues,
  dashboardUid,
  defaultValues,
  isEditReport,
}) => {
  const styles = getStyles(useTheme());

  const [state, setState] = useState({
    testMailBtnLoading: false,
    previewBtnLoading: false,
    showModal: false,
  });
  useEffect(() => {
    watch([
      'recipients',
      'period',
      'months',
      'monthDays',
      'weekDays',
      'reportType',
      'timeRange',
      'filter',
      'orientation',
      'layout',
    ]);
  }, []);

  const toggleTestMailBtn = (value: boolean) => {
    setState({ ...state, testMailBtnLoading: value });
  };
  const togglePreviewPDFBtn = (value: boolean) => {
    setState({ ...state, previewBtnLoading: value });
  };
  const toggleModal = (value: boolean) => {
    setState({ ...state, showModal: value });
  };

  const dashIsSelected = getValues().dashboard?.uid !== undefined;

  return (
    <div className={styles.formContainer}>
      <div className={styles.formItem}>
        <ReportBasicSettings
          canChangeDashboard={isEditReport || (dashboardUid ? true : false)} //{dashboardUid ? true : false}
          register={register}
          errors={errors}
          control={control}
          dashboardsOptions={dashboardsOptions}
          dashboardFilters={dashboardFilters}
          timeRangeOptions={timeRangeOptions}
          filterOptions={filterOptions}
          recipientsOptions={recipientsOptions}
          onDashboardChange={onDashboardChange}
          setValue={setValue}
          reportTypeOptions={preReportTypeOptions}
          getValues={getValues}
          watch={watch}
        />
      </div>
      {getValues().reportType === ReportType.PDF && (
        <div className={styles.formItem}>
          <CollapsableSection label={'PDF Styling'} isOpen={true}>
            <ReportOptions
              register={register}
              errors={errors}
              control={control}
              orientationOptions={orientationOptions}
              layoutOptions={layoutOptions}
              themeOptions={themeOptions}
              setValue={setValue}
              getValues={getValues}
              watch={watch}
            />
          </CollapsableSection>
        </div>
      )}
      <div className={styles.formItem}>
        <CollapsableSection label={'Scheduler'} isOpen={true}>
          <ReportSchedulerSettings
            register={register}
            errors={errors}
            control={control}
            frequencyPeriod={defaultValues.period}
            frequencyOptions={frequencyOptions}
            weekDaysOptions={weekDaysOptions}
            monthsOptions={monthsOptions}
            timezonesOptions={timezonesOptions}
            currentFormValues={currentFormValues}
            setValue={setValue}
            getValues={getValues}
            watch={watch}
          />
        </CollapsableSection>
      </div>
      <div className={styles.formButtons}>
        <HorizontalGroup>
          <Button type="submit" disabled={!dashIsSelected}>
            Save
          </Button>
          {getValues().reportType === ReportType.PDF && (
            <Button
              type="button"
              variant="secondary"
              disabled={state.previewBtnLoading || state.testMailBtnLoading || !dashIsSelected}
              onClick={async () => {
                if (getValues().reportType !== ReportType.PDF) {
                  return;
                }
                togglePreviewPDFBtn(true);
                onPreviewReport(getValues(), () => {
                  togglePreviewPDFBtn(false);
                });
              }}
            >
              <span>Preview PDF {state.previewBtnLoading && <Spinner inline={true}></Spinner>} </span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={state.previewBtnLoading || !dashIsSelected}
            onClick={() => {
              toggleModal(true);
            }}
          >
            Send test email {state.testMailBtnLoading && <Spinner inline={true}></Spinner>}
          </Button>
          <ReportMailingDialog
            show={state.showModal}
            recipients={getValues().recipients}
            onSubmit={(value: any, callback: () => void) => {
              toggleTestMailBtn(true);
              var formValues = getValues();
              formValues.recipients = value;
              onTestReport(formValues, () => {
                toggleTestMailBtn(true);
                toggleModal(false);
                callback();
              });
            }}
            onClose={() => {
              toggleModal(false);
            }}
          />
          <a href={'reports' + (dashboardUid ? `/d/${dashboardUid}` : '')}>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </a>
        </HorizontalGroup>
      </div>
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    formContainer: css``,
    formItem: css`
      flex-grow: 1;
      padding-top: ${theme.spacing.md};
    `,
    formButtons: css`
      padding-top: ${theme.spacing.xl};
    `,
    modal: css`
      width: 500px;
    `,
  };
});
