import { css } from '@emotion/css';
import React, { useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { Dropdown, FilterInput, IconButton, Menu } from '@grafana/ui';
import { StoreState } from 'app/types';

import { changeSearchQuery, changeTeamFilter } from './state/actions';
import { getTeamsSearchQuery, TEAM_FILTER } from './state/selectors';

function mapStateToProps(state: StoreState) {
  return {
    searchQuery: getTeamsSearchQuery(state.rbacTeams),
  };
}

const mapDispatchToProps = {
  changeSearchQuery,
  changeTeamFilter,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type Props = { roleId: number; selectedCount: number | undefined } & ConnectedProps<typeof connector>;

export const TeamsActionBarUnconnected = ({
  roleId,
  selectedCount,
  searchQuery,
  changeSearchQuery,
  changeTeamFilter,
}: Props): JSX.Element => {
  const [teamFilter, setTeamFilter] = useState<string>(TEAM_FILTER.ALL);

  const teamFilterChanged = (filterValue: string) => {
    setTeamFilter(filterValue);
    changeTeamFilter(filterValue, roleId);
  };

  const ActionMenu = ({
    changeFilter,
    currentFilter,
  }: {
    changeFilter: (filter: string) => void;
    currentFilter: string;
  }) => {
    const isFilterAll = currentFilter === TEAM_FILTER.ALL;
    const menu = (
      <Menu>
        <Menu.Item
          label={TEAM_FILTER.ALL}
          onClick={() => changeFilter(TEAM_FILTER.ALL)}
          active={isFilterAll}
          icon={isFilterAll ? 'check-circle' : 'circle'}
        />
        <Menu.Item
          label={TEAM_FILTER.ASSIGNED}
          onClick={() => changeFilter(TEAM_FILTER.ASSIGNED)}
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
    <div className="page-action-bar" data-testid="teams-action-bar">
      <div className="gf-form gf-form--grow">
        <FilterInput
          value={searchQuery}
          onChange={(val) => changeSearchQuery(val, roleId)}
          placeholder="Search team name"
        />
        <ActionMenu changeFilter={teamFilterChanged} currentFilter={teamFilter}></ActionMenu>
      </div>
    </div>
  );
};

export const TeamsActionBar = connector(TeamsActionBarUnconnected);
