import { css } from '@emotion/css';
import React, { useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { Dropdown, FilterInput, IconButton, Menu } from '@grafana/ui';
import { StoreState } from 'app/types';

import { changeSearchQuery, changeUserFilter } from './state/actions';
import { getUsersSearchQuery, USER_FILTER } from './state/selectors';

function mapStateToProps(state: StoreState) {
  return {
    searchQuery: getUsersSearchQuery(state.rbacUsers),
  };
}

const mapDispatchToProps = {
  changeSearchQuery,
  changeUserFilter,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type Props = { roleId: number; selectedCount: number | undefined } & ConnectedProps<typeof connector>;

export const UsersActionBarUnconnected = ({
  roleId,
  selectedCount,
  searchQuery,
  changeSearchQuery,
  changeUserFilter,
}: Props): JSX.Element => {
  const [userFilter, setUserFilter] = useState<string>(USER_FILTER.ALL);

  const userFilterChanged = (filterValue: string) => {
    setUserFilter(filterValue);
    changeUserFilter(filterValue, roleId);
  };

  const ActionMenu = ({
    changeFilter,
    currentFilter,
  }: {
    changeFilter: (filter: string) => void;
    currentFilter: string;
  }) => {
    const isFilterAll = currentFilter === USER_FILTER.ALL;
    const menu = (
      <Menu>
        <Menu.Item
          label={USER_FILTER.ALL}
          onClick={() => changeFilter(USER_FILTER.ALL)}
          active={isFilterAll}
          icon={isFilterAll ? 'check-circle' : 'circle'}
        />
        <Menu.Item
          label={USER_FILTER.ASSIGNED}
          onClick={() => changeFilter(USER_FILTER.ASSIGNED)}
          active={!isFilterAll}
          icon={!isFilterAll ? 'check-circle' : 'circle'}
          disabled={!selectedCount}
        />
      </Menu>
    );

    return (
      <div
        className={css`
          margin: 4px;
        `}
      >
        <Dropdown overlay={menu}>
          <IconButton title="Menu" name="filter" size="xl" />
        </Dropdown>
      </div>
    );
  };

  return (
    <div className="page-action-bar" data-testid="users-action-bar">
      <div className="gf-form gf-form--grow">
        <FilterInput
          value={searchQuery}
          onChange={(val) => changeSearchQuery(val, roleId)}
          placeholder="Search user by login, email or name"
        />
        <ActionMenu changeFilter={userFilterChanged} currentFilter={userFilter}></ActionMenu>
      </div>
    </div>
  );
};

export const UsersActionBar = connector(UsersActionBarUnconnected);
