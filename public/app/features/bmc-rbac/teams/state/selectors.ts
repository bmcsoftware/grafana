import { BMCTeamsState } from 'app/types';

export const getTeamsSearchQuery = (state: BMCTeamsState) => state.searchQuery;

export const TEAM_FILTER = {
  ALL: 'All',
  ASSIGNED: 'Assigned',
};
