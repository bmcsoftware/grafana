/*
BMC File
Author - mahmedi
*/

import React, { useEffect } from 'react';

import { urlUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { FilterInput, LinkButton, VerticalGroup } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { connectWithCleanUp } from 'app/core/components/connectWithCleanUp';
import { BMCRole, StoreState } from 'app/types';

import { PermissionListDrawer } from '../permissions/PermissionListDrawer';

import { RoleListRow } from './RoleListRow';
import { changeSearchQuery, deleteRole, loadRoles } from './state/actions';
import { initialRolesState } from './state/reducers';
import { getRoles, getSearchRoleQuery, sortedRoles } from './state/selectors';

export interface Props {
  roles: BMCRole[];
  page: number;
  searchRoleQuery: string;
  totalPages: number;
  hasFetched: boolean;
  loadRoles: typeof loadRoles;
  deleteRole: typeof deleteRole;
  changeSearchQuery: typeof changeSearchQuery;
}

export const RoleList = ({
  roles,
  page,
  searchRoleQuery,
  totalPages,
  hasFetched,
  loadRoles,
  deleteRole,
  changeSearchQuery,
}: Props) => {
  const params = urlUtil.getUrlSearchParams();
  const [defaultDrawer, hideDrawer] = React.useState<boolean>(false);
  useEffect(() => {
    if (params['roleId']) {
      hideDrawer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    loadRoles(true);
  }, [loadRoles]);

  //   const canCreate = canCreateRole(editorsCanAdmin);
  //   const displayRolePicker = shouldDisplayRolePicker();
  return (
    <Page navId="roles">
      <div className="page-action-bar">
        <div className="gf-form gf-form--grow">
          <FilterInput placeholder="Search roles" value={searchRoleQuery} onChange={changeSearchQuery} />
        </div>
        {/* // href={canCreate ? 'org/roles/new' : '#'} disabled={!canCreate} */}
        <LinkButton href={'org/roles/new'}>New Role</LinkButton>
      </div>
      <Page.Contents isLoading={!hasFetched}>
        <div className="admin-list-table">
          <VerticalGroup spacing="md">
            <table className="filter-table filter-table--hover form-inline">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: '25%' }}>Type</th>
                  <th style={{ width: '25%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRoles(roles).map((role) => (
                  <RoleListRow key={role.id} role={role} onDelete={deleteRole} />
                ))}
              </tbody>
            </table>
          </VerticalGroup>

          {defaultDrawer ? (
            <PermissionListDrawer
              onDismiss={() => {
                locationService.push(`roles`);
                hideDrawer(false);
              }}
              role={{ id: Number(params['roleId']), name: '', systemRole: false }}
            />
          ) : null}
        </div>
      </Page.Contents>
    </Page>
  );
};

// function canCreateRole(editorsCanAdmin: boolean): boolean {
//   const teamAdmin = contextSrv.hasRole('Admin') || (editorsCanAdmin && contextSrv.hasRole('Editor'));
//   return contextSrv.hasAccess(AccessControlAction.ActionTeamsCreate, teamAdmin);
// }

function mapStateToProps(state: StoreState) {
  const searchQuery = getSearchRoleQuery(state.roles);
  return {
    roles: getRoles(state.roles),
    page: state.roles.page,
    searchRoleQuery: searchQuery,
    perPage: state.roles.perPage,
    totalPages: state.roles.totalCount,
    hasFetched: state.roles.hasFetched,
  };
}

const mapDispatchToProps = {
  loadRoles,
  deleteRole,
  changeSearchQuery,
};

export default connectWithCleanUp(
  mapStateToProps,
  mapDispatchToProps,
  (state) => (state.roles = initialRolesState)
)(RoleList);
