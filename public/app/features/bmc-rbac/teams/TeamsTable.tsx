import { css } from '@emotion/css';
import React, { FormEvent } from 'react';

import { Checkbox } from '@grafana/ui';
import { BMCTeam } from 'app/types';

interface Props {
  teams: BMCTeam[];
  roleId: number;
  onSelectAllChange: (checked: boolean, roleId: number) => void;
  onTeamCheckboxChange: (checked: boolean, teamId: number) => void;
}

export const TeamsTable = ({ teams, roleId, onSelectAllChange, onTeamCheckboxChange }: Props) => {
  const handleSelectAllChange = (event: FormEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onSelectAllChange(checked, roleId);
  };

  const handleTeamCheckboxChange = (event: FormEvent<HTMLInputElement>, team: BMCTeam) => {
    const isChecked = event.currentTarget.checked;
    onTeamCheckboxChange(isChecked, team.id);
  };

  return (
    <div
      // TODO: temp fix for height, need to come back and give dynamic height.
      className={css`
        display: flex;
        flex-direction: column;
        overflow-y: scroll;
        max-height: 450px;
      `}
    >
      <table className="filter-table form-inline">
        <thead>
          <tr>
            <th>
              <Checkbox
                checked={teams.length ? !teams.find((team) => !team.isChecked) : false}
                onChange={handleSelectAllChange}
              />
            </th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={`${team.id}-${index}`}>
              <td className="width-2 text-center">
                <Checkbox checked={team.isChecked} onChange={(e) => handleTeamCheckboxChange(e, team)} />
              </td>
              <td className="max-width-5">
                <span className="ellipsis" title={team.name}>
                  {team.name}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
