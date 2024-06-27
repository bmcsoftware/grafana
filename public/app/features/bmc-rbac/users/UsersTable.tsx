import { css } from '@emotion/css';
import React, { FormEvent } from 'react';

import { Checkbox } from '@grafana/ui';
import { BMCUser } from 'app/types';

interface Props {
  users: BMCUser[];
  roleId: number;
  onSelectAllChange: (checked: boolean, roleId: number) => void;
  onUserCheckboxChange: (checked: boolean, userId: number) => void;
}

export const UsersTable = ({ users, roleId, onSelectAllChange, onUserCheckboxChange }: Props) => {
  const handleSelectAllChange = (event: FormEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onSelectAllChange(checked, roleId);
  };

  const handleUserCheckboxChange = (event: FormEvent<HTMLInputElement>, user: BMCUser) => {
    const isChecked = event.currentTarget.checked;
    onUserCheckboxChange(isChecked, user.id);
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
                checked={users.length ? !users.find((user) => !user.isChecked) : false}
                // Disable for viewer role, role id for viewer will always be 3
                disabled={roleId === 3}
                onChange={handleSelectAllChange}
              />
            </th>
            <th>Login</th>
            <th>Email</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={`${user.id}-${index}`}>
              <td className="width-2 text-center">
                <Checkbox
                  checked={user.isChecked}
                  onChange={(e) => handleUserCheckboxChange(e, user)}
                  // Disable for viewer role, role id for viewer will always be 3
                  disabled={roleId === 3}
                />
              </td>
              <td className="max-width-6">
                <span className="ellipsis" title={user.login}>
                  {user.login}
                </span>
              </td>
              <td className="max-width-5">
                <span className="ellipsis" title={user.email}>
                  {user.email}
                </span>
              </td>
              <td className="max-width-5">
                <span className="ellipsis" title={user.name}>
                  {user.name}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
