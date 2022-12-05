import { TimeZone } from '@grafana/data';

export interface UserPreferencesDTO {
  timezone: TimeZone;
  weekStart: string;
  homeDashboardId: number;
  theme: string;
  queryHistory: {
    homeTab: '' | 'query' | 'starred';
  };
  // BMC code
  docLink: string;
  supportLink: string;
  communityLink: string;
  videoLink: string;
  // End
}
