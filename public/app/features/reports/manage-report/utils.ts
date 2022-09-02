import { getTimeZoneGroups } from '@grafana/data';
import { config } from '@grafana/runtime';
import sanitizeHtml from 'sanitize-html';
import { union, range, flatMap } from 'lodash';
import { getCronStringFromValues, getValuesFromCronString } from '../cron-converter/converter';
import { SchedulerObject } from '../cron-converter/types';
import {
  PDFTheme,
  PDFLayout,
  PDFOrientation,
  ReportDashboardItem,
  ReportDayItem,
  ReportDTO,
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
  ReportFilterItem,
  ReportFormTypeItem,
  ReportType,
} from './types';

export const REPORT_ITEM_HEIGHT = 48;
export const REPORT_ITEM_MARGIN = 4;

export const reportTypeOptions: ReportFormTypeItem[] = [
  { label: 'PDF', value: ReportType.PDF },
  { label: 'CSV', value: ReportType.CSV },
  { label: 'XLS', value: ReportType.XLS },
];

export const orientationOptions: ReportFormOrientationItem[] = [
  { label: 'Portrait', value: PDFOrientation.PORTRAIT },
  { label: 'Landscape', value: PDFOrientation.LANDSCAPE },
];

export const layoutOptions: ReportFormLayoutItem[] = [
  { label: 'Grid', value: PDFLayout.GRID },
  { label: 'Simple', value: PDFLayout.SIMPLE },
];

export const themeOptions: ReportFormThemeItem[] = [
  { label: 'Dark', value: PDFTheme.DARK },
  { label: 'Light', value: PDFTheme.LIGHT },
];

export const timeRangeOptions: ReportTimeRangeItem[] = [
  { value: '', label: 'Default' },
  { value: 'now-5m', label: 'Last 5 minutes' },
  { value: 'now-15m', label: 'Last 15 minutes' },
  { value: 'now-30m', label: 'Last 30 minutes' },
  { value: 'now-1h', label: 'Last 1 hour' },
  { value: 'now-3h', label: 'Last 3 hours' },
  { value: 'now-6h', label: 'Last 6 hours' },
  { value: 'now-12h', label: 'Last 12 hours' },
  { value: 'now-24h', label: 'Last 24 hours' },
  { value: 'now-2d', label: 'Last 2 days' },
  { value: 'now-7d', label: 'Last 7 days' },
  { value: 'now-30d', label: 'Last 30 days' },
  { value: 'now-90d', label: 'Last 90 days' },
  { value: 'now-6M', label: 'Last 6 months' },
  { value: 'now-1y', label: 'Last 1 year' },
  { value: 'now-2y', label: 'Last 2 years' },
  { value: 'now-5y', label: 'Last 5 years' },
];

export const frequencyOptions: ReportFormFrequencyItem[] = [
  { label: 'Yearly', value: 'year' },
  { label: 'Monthly', value: 'month' },
  { label: 'Weekly', value: 'week' },
  { label: 'Daily', value: 'day' },
  { label: 'Hourly', value: 'hour' },
];

export const timeZones: ReportTimezoneItem[] = getTimeZoneGroups().reduce(
  (tzs, group) => {
    const options = group.zones.map((tz: any) => ({ label: tz, value: tz }));
    tzs.push.apply(tzs, options);
    return tzs;
  },
  [{ label: 'UTC', value: 'utc' }]
);

export const filterOptions: ReportFilterItem[] = [
  { label: 'Use default variables', value: '', description: 'Default dashboard variables' },
];

export const monthsOptions: ReportMonthItem[] = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May	', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

export const weekDaysOptions: ReportDayItem[] = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 7 },
];

export const emailValidator = (email: string) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

/*
 * Get string of numbers and range of numbers, and return array of unique numbers
 */
export const convertStringToNumberArray = (numbersAsString: string): number[] => {
  const arr = numbersAsString.replace(/\s/g, '').split(',');
  return union(
    flatMap(
      arr.map((item) => {
        if (item.includes('-')) {
          const _range: string[] = item.split('-');
          return range(+_range[0], +_range[1] + 1);
        }
        return [+item];
      })
    )
  );
};

/*
 * Transform Form object to Report object
 */
export const transformSubmitData = (formData: ReportFormDTO, defaultValues: ReportFormDTO): ReportDTO => {
  const scheduler: SchedulerObject = {
    period: formData.period ? formData.period : defaultValues.period,
    months: formData.months
      ? formData.months.map((item) => item.value)
      : defaultValues.months.map((item) => item.value),
    monthDays: formData.monthDays
      ? convertStringToNumberArray(formData.monthDays)
      : convertStringToNumberArray(defaultValues.monthDays),
    weekDays: formData.weekDays
      ? formData.weekDays.map((item) => item.value)
      : defaultValues.weekDays.map((item) => item.value),
    hours: formData.hours
      ? convertStringToNumberArray(formData.hours)
      : convertStringToNumberArray(defaultValues.hours),
    minutes: formData.minutes ? [formData.minutes] : [defaultValues.minutes],
  };
  const cronString = getCronStringFromValues(scheduler);

  // Sanitize both subject & message
  formData.subject = sanitizeHtml(formData.subject);
  formData.message = sanitizeHtml(formData.message);
  const report: ReportDTO = {
    id: defaultValues.id,
    name: formData.name,
    enabled: formData.enabled,
    description: formData.description,
    dashboardId: formData.dashboard.value,
    subject: formData.subject,
    recipients: formData.recipients.map((recipient) => recipient.value),
    message: formData.message,
    orientation: formData.orientation ? formData.orientation : defaultValues.orientation,
    layout: formData.layout ? formData.layout : defaultValues.layout,
    theme: formData.theme ? formData.theme : defaultValues.theme,
    cron: cronString,
    timezone: formData.timezone ? formData.timezone.value : defaultValues.timezone.value,
    timeRange: formData.timeRange?.value,
    filter: formData.filter?.value,
    reportType: formData.reportType ? formData.reportType : defaultValues.reportType,
  };
  return report;
};

export const transformDataTestReport = (formData: ReportFormDTO, defaultValues: ReportFormDTO): any => {
  const scheduler: SchedulerObject = {
    period: formData.period ? formData.period : defaultValues.period,
    months: formData.months
      ? formData.months.map((item) => item.value)
      : defaultValues.months.map((item) => item.value),
    monthDays: formData.monthDays
      ? convertStringToNumberArray(formData.monthDays)
      : convertStringToNumberArray(defaultValues.monthDays),
    weekDays: formData.weekDays
      ? formData.weekDays.map((item) => item.value)
      : defaultValues.weekDays.map((item) => item.value),
    hours: formData.hours
      ? convertStringToNumberArray(formData.hours)
      : convertStringToNumberArray(defaultValues.hours),
    minutes: formData.minutes ? [formData.minutes] : [defaultValues.minutes],
  };
  const cronString = getCronStringFromValues(scheduler);
  const currentUser = config.bootData.user;
  const payload = {
    id: defaultValues.id,
    name: formData.name,
    uid: formData.dashboard.uid,
    enabled: formData.enabled,
    description: formData.description,
    subject: formData.subject,
    recipients: formData.recipients.map((recipient) => recipient.value),
    message: formData.message,
    orientation: formData.orientation ? formData.orientation : defaultValues.orientation,
    layout: formData.layout ? formData.layout : defaultValues.layout,
    cron: cronString,
    timezone: formData.timezone ? formData.timezone.value : defaultValues.timezone.value,
    timeRange: formData.timeRange?.value,
    filter: formData.filter?.value,
    userId: currentUser.id,
    orgId: currentUser.orgId,
    reportType: formData.reportType,
  };
  return payload;
};

export const transformDataPreviewReport = (formData: ReportFormDTO, defaultValues: ReportFormDTO): any => {
  const currentUser = config.bootData.user;
  const payload = {
    id: defaultValues.id,
    name: formData.name,
    description: formData.description,
    uid: formData.dashboard.uid,
    orientation: formData.orientation ? formData.orientation : defaultValues.orientation,
    layout: formData.layout ? formData.layout : defaultValues.layout,
    timezone: formData.timezone ? formData.timezone.value : defaultValues.timezone.value,
    timeRange: formData.timeRange?.value,
    filter: formData.filter?.value,
    userId: currentUser.id,
    orgId: currentUser.orgId,
  };
  return payload;
};

const checkReportFilter = (filter: string): ReportFilterItem => {
  if (filter && filter !== '') {
    return {
      label: 'Use saved variables',
      value: filter,
    };
  }
  return filterOptions[0];
};

/*
 * Transform Report object to form data object
 */
export const transformReportDataToFormObject = (
  report: any,
  dashboard: ReportDashboardItem,
  timezone: ReportTimezoneItem,
  recipients: ReportRecipientItem[],
  action: ReportManageMode
) => {
  const { period, months, monthDays, weekDays, hours, minutes } = getValuesFromCronString(report.cron);
  const reportFormDTO: ReportFormDTO = {
    id: report.id,
    name: action === ReportManageMode.EDIT ? report.name : '',
    enabled: report.enabled,
    description: report.description,
    dashboard: dashboard,
    subject: report.subject,
    recipients: recipients,
    message: report.message,
    orientation: report.orientation,
    layout: report.layout,
    theme: report.theme,
    period: period,
    months: months ? months.flatMap((item) => Object.values(monthsOptions).filter((key) => key.value === item)) : [],
    monthDays: monthDays ? monthDays.join(', ') : '',
    weekDays: weekDays
      ? weekDays.flatMap((item) => Object.values(weekDaysOptions).filter((key) => key.value === item))
      : [],
    hours: hours ? hours.join(', ') : '',
    minutes: minutes ? minutes[0] : 0,
    timezone: timezone,
    timeRange: timeRangeOptions.filter((key) => key.value === report.timeRange)[0],
    filter: checkReportFilter(report.filter),
    reportType: report.reportType,
  };
  return reportFormDTO;
};

export const nonDuplicatedRecipients = (recipients: ReportRecipientItem[]) =>
  recipients.filter(
    (recipient: ReportRecipientItem, i: number, self: ReportRecipientItem[]) =>
      i === self.findIndex((t) => t.value === recipient.value)
  );
