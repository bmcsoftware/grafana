import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReportFilterItem, ReportDashboardItem, ReportDistributionState, ReportRecipientItem } from '../types';
import {
  emailValidator,
  frequencyOptions,
  orientationOptions,
  layoutOptions,
  themeOptions,
  monthsOptions,
  timeRangeOptions,
  filterOptions,
  timeZones,
  weekDaysOptions,
} from '../utils';

export const initialReportDistributionState: ReportDistributionState = {
  dashboardsOptions: [],
  recipientsOptions: [],
  recipientsCustomOptions: [],
  frequencyOptions: frequencyOptions,
  orientationOptions: orientationOptions,
  layoutOptions: layoutOptions,
  themeOptions: themeOptions,
  weekDaysOptions: weekDaysOptions,
  monthsOptions: monthsOptions,
  timezonesOptions: timeZones,
  timeRangeOptions: timeRangeOptions,
  filterOptions: filterOptions,
  dashboardFilters: [],
};

const reportsDistributionSlice = createSlice({
  name: 'reports',
  initialState: initialReportDistributionState,
  reducers: {
    dashboardFilterLoaded: (state, action: PayloadAction<any>): any => {
      const { dashboard } = action.payload;
      const dashboardFiltersList: ReportFilterItem[] = dashboard.templating.list.map((template: any) => {
        const filter: ReportFilterItem = {
          label: template.label,
          value: `var-${template.name}`,
        };
        return filter;
      });
      return { ...state, dashboardFilters: dashboardFiltersList };
    },
    dashboardsLoaded: (state, action: PayloadAction<any[]>): ReportDistributionState => {
      const dashboardsList: ReportDashboardItem[] = action.payload.map((dashItem) => {
        return { label: dashItem.title, value: dashItem.id, uid: dashItem.uid, tags: dashItem.tags || [] };
      });
      return { ...state, dashboardsOptions: dashboardsList };
    },
    usersLoaded: (state, action: PayloadAction<any[]>): ReportDistributionState => {
      const usersWithValidEmails = action.payload.filter((item: any) => emailValidator(item.email));
      const recipientsList: ReportRecipientItem[] = usersWithValidEmails.map((userItem: any) => {
        return {
          label: userItem.name ? userItem.name : userItem.login,
          value: userItem.email,
          description: userItem.email,
        };
      });
      return { ...state, recipientsOptions: recipientsList };
    },
  },
});

export const { dashboardsLoaded, dashboardFilterLoaded, usersLoaded } = reportsDistributionSlice.actions;

export const reportsDistributionReducer = reportsDistributionSlice.reducer;

export default {
  reportDistribution: reportsDistributionReducer,
};
