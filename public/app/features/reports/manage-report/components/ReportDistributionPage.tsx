import { AppEvents, NavModel } from '@grafana/data';
// import { AppEvents } from '@grafana/data';
import { getBackendSrv, getLocationSrv } from '@grafana/runtime';
import { Form, Spinner } from '@grafana/ui';
import Page from 'app/core/components/Page/Page';
import { appEvents } from 'app/core/core';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';
import React, { PureComponent } from 'react';
import { connect, ConnectedProps as CP, MapDispatchToProps, MapStateToProps } from 'react-redux';
import {
  createReport,
  loadDashboards,
  loadDashboardFilters,
  loadUsers,
  previewReport,
  testReport,
  updateReport,
} from '../state/actions';
import {
  PDFOrientation,
  ReportDashboardItem,
  ReportDayItem,
  ReportFilterItem,
  ReportFormDTO,
  ReportFormFrequencyItem,
  ReportFormLayoutItem,
  ReportFormThemeItem,
  ReportFormOrientationItem,
  ReportManageMode,
  ReportMonthItem,
  ReportRecipientItem,
  ReportTimeRangeItem,
  ReportTimezoneItem,
  PDFLayout,
  PDFTheme,
  ReportType,
  ReportFormTypeItem,
} from '../types';
import {
  reportTypeOptions,
  timeZones,
  transformDataPreviewReport,
  transformDataTestReport,
  transformReportDataToFormObject,
  transformSubmitData,
} from '../utils';
import { ReportDistributionForm } from './ReportDistributionForm';
import { getTimeZone } from '@grafana/data/src/datetime/common';
import sanitizeHtml from 'sanitize-html';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';

interface OwnProps {
  action: ReportManageMode;
  dashboardUid: string;
  reportId: string;
}

interface ConnectedProps {
  navModel: NavModel;
  dashboardsOptions: ReportDashboardItem[];
  dashboardFilters: ReportFilterItem[];
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
}

interface DispatchProps {
  createReport: typeof createReport;
  loadDashboards: typeof loadDashboards;
  loadDashboardFilters: typeof loadDashboardFilters;
  loadUsers: typeof loadUsers;
  updateReport: typeof updateReport;
  testReport: typeof testReport;
  previewReport: typeof previewReport;
}

export interface ReportDistState {
  enabled: boolean;
  formTitle: string;
  isLoading: boolean;
  dashboardFilters: ReportFilterItem[];
  preReportTypeOptions: ReportFormTypeItem[];
}

interface ReportProps extends GrafanaRouteComponentProps<{ id?: string; uid?: string; action?: string }> {}

const mapStateToProps: MapStateToProps<{}, ReportProps, StoreState> = (state: StoreState, props) => {
  return {
    navModel: getNavModel(state.navIndex, 'manage-reports'),
    reportId: props.match.params.id,
    dashboardsOptions: state.reportDistribution.dashboardsOptions,
    recipientsOptions: state.reportDistribution.recipientsOptions,
    frequencyOptions: state.reportDistribution.frequencyOptions,
    orientationOptions: state.reportDistribution.orientationOptions,
    layoutOptions: state.reportDistribution.layoutOptions,
    themeOptions: state.reportDistribution.themeOptions,
    weekDaysOptions: state.reportDistribution.weekDaysOptions,
    monthsOptions: state.reportDistribution.monthsOptions,
    timezonesOptions: state.reportDistribution.timezonesOptions,
    timeRangeOptions: state.reportDistribution.timeRangeOptions,
    filterOptions: state.reportDistribution.filterOptions,
    action: props.match.params.action,
    dashboardUid: props.match.params.uid,
  };
};

const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = {
  createReport,
  loadDashboards,
  loadDashboardFilters,
  loadUsers,
  updateReport,
  testReport,
  previewReport,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = CP<typeof connector>;
type Props = OwnProps & PropsFromRedux & ConnectedProps;

class ReportDistributionPage extends PureComponent<Props, ReportDistState> {
  state = {
    enabled: true,
    formTitle: 'New Scheduled Report',
    isLoading: true,
    dashboardFilters: new Array(0),
    preReportTypeOptions: reportTypeOptions,
  };

  defaultValues: ReportFormDTO = {
    id: undefined,
    name: '',
    enabled: true,
    description: '',
    dashboard: this.props.dashboardsOptions[0],
    subject: '',
    recipients: new Array(0),
    message: '',
    orientation: PDFOrientation.PORTRAIT,
    layout: PDFLayout.GRID,
    theme: PDFTheme.LIGHT,
    timeRange: this.props.timeRangeOptions[0],
    filter: this.props.filterOptions[0],
    timezone: timeZones[0],
    period: 'week',
    months: new Array(0),
    monthDays: '',
    weekDays: new Array(0),
    hours: '',
    minutes: 0,
    reportType: ReportType.PDF,
  };

  buildReportRecipients(recipients: string[]) {
    return recipients.reduce((acc: ReportRecipientItem[], repRec: string) => {
      const rec = this.props.recipientsOptions.find((rec: any) => rec.value === repRec);
      if (rec) {
        acc.push(rec);
      } else {
        const recipient: ReportRecipientItem = { label: repRec, value: repRec };
        acc.push(recipient);
      }
      return acc;
    }, []);
  }

  componentDidMount() {
    const promises = [this.props.loadDashboards(), this.props.loadUsers()];
    return Promise.all(promises).then(async (_) => {
      const { action, reportId, dashboardUid, dashboardsOptions, timezonesOptions } = this.props;
      if (action !== ReportManageMode.NEW) {
        await getBackendSrv()
          .get(`/api/reports/${reportId}`)
          .then(
            (report) => {
              try {
                // build report dashboard object
                const reportDash: ReportDashboardItem[] = this.props.dashboardsOptions.filter(
                  (dash: ReportDashboardItem) => dash.value === report.dashboardId
                );
                if (!reportDash || reportDash.length === 0) {
                  throw { message: `Dashboard not found. Dashboard id ${report.dashboardId} deleted or changed.` };
                }

                // build report time zone object
                const reportTZ = timezonesOptions.filter((tz: ReportTimezoneItem) => tz.value === report.timezone);

                // build report recipients objects
                const reportRecipients = this.buildReportRecipients(report.recipients);

                // transform report to report form object
                const values = transformReportDataToFormObject(
                  report,
                  dashboardUid ? reportDash.filter((dash) => dash.uid === dashboardUid)[0] : reportDash[0],
                  reportTZ[0],
                  reportRecipients,
                  action
                );

                this.defaultValues.subject = sanitizeHtml(this.defaultValues.subject);
                this.defaultValues.message = sanitizeHtml(this.defaultValues.message);

                this.defaultValues = {
                  ...this.defaultValues,
                  ...values,
                };

                // update state
                this.setState({
                  ...this.state,
                  formTitle:
                    action === ReportManageMode.EDIT ? `Edit ${report.name} report` : `Clone ${report.name} report`,
                });
              } catch (err) {
                if (err?.message) {
                  appEvents.emit(AppEvents.alertError, ['Failed to load report']);
                  getLocationSrv().update({ path: 'reports' });
                }
              }
            },
            (error) => {
              getLocationSrv().update({ path: 'reports' });
            }
          );
      }
      if (dashboardUid) {
        this.defaultValues.dashboard = dashboardsOptions.filter(
          (dash: ReportDashboardItem) => dash.uid === dashboardUid
        )[0];
      }
      if (action === ReportManageMode.NEW) {
        if (getTimeZone() === 'browser') {
          // Todo: Should get browser timezone name
        } else if (getTimeZone() === 'utc') {
          this.defaultValues.timezone = {
            label: 'UTC',
            value: 'UTC',
          };
        } else {
          this.defaultValues.timezone = {
            label: getTimeZone(),
            value: getTimeZone(),
          };
        }
      }
      this.props.loadDashboardFilters(this.defaultValues.dashboard?.uid, (filters: any, reportTypes: any) => {
        this.setState({
          ...this.state,
          dashboardFilters: filters,
          preReportTypeOptions: reportTypes,
        });
      });

      this.setState({
        ...this.state,
        isLoading: false,
      });
      return;
    });
  }

  onSubmit = (data: ReportFormDTO) => {
    sessionStorage.removeItem('reportFilter');
    if (this.props.action === ReportManageMode.EDIT) {
      this.props.updateReport(transformSubmitData(data, this.defaultValues));
    } else {
      data.enabled = true;
      this.props.createReport(transformSubmitData(data, this.defaultValues));
    }
  };

  onTestReport = (data: ReportFormDTO, callback: () => void) => {
    this.props.testReport(transformDataTestReport(data, this.defaultValues), callback);
  };

  onPreviewReport = (data: ReportFormDTO, callback: () => void) => {
    this.props.previewReport(transformDataPreviewReport(data, this.defaultValues), callback);
  };

  onDashboardChange = (uid: string, callback: (filters: any, reportTypes: any) => void) => {
    this.props.loadDashboardFilters(uid, callback);
  };

  render() {
    const { navModel } = this.props;

    return (
      <Page navModel={navModel}>
        {this.state.isLoading ? (
          <Spinner />
        ) : (
          <Page.Contents>
            <h2 className="page-sub-heading">{this.state.formTitle}</h2>
            <Form
              onSubmit={this.onSubmit}
              validateOn="onSubmit"
              defaultValues={this.defaultValues}
              maxWidth={600}
              onKeyDown={(e: React.KeyboardEvent<Element>) => e.key === 'Enter' && e.preventDefault()}
            >
              {({ register, errors, control, getValues, watch, setValue }) => {
                return (
                  <ReportDistributionForm
                    {...this.props}
                    onTestReport={(data: ReportFormDTO, callback: () => void) => this.onTestReport(data, callback)}
                    onPreviewReport={(data: ReportFormDTO, callback: () => void) =>
                      this.onPreviewReport(data, callback)
                    }
                    defaultValues={this.defaultValues}
                    isEditReport={this.props.reportId !== undefined}
                    onDashboardChange={this.onDashboardChange}
                    register={register}
                    dashboardFilters={this.state.dashboardFilters}
                    preReportTypeOptions={this.state.preReportTypeOptions}
                    errors={errors}
                    getValues={getValues}
                    setValue={setValue}
                    control={control}
                    watch={watch}
                    currentFormValues={getValues()}
                  />
                );
              }}
            </Form>
          </Page.Contents>
        )}
      </Page>
    );
  }
}

export default connector(ReportDistributionPage);
