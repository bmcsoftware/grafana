import { BMCUsersState } from 'app/types';

export const getUsersSearchQuery = (state: BMCUsersState) => state.searchQuery;

export const USER_FILTER = {
  ALL: 'All',
  ASSIGNED: 'Assigned',
};
