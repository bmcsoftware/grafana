import { css } from '@emotion/css';
import { startCase } from 'lodash';
import React, { FC, useState } from 'react';

import { Icon, Checkbox } from '@grafana/ui';

import { orderActions } from './state/helpers';
import { PermissionGroup } from './state/types';

type Props = {
  displayName: string;
  resource: string;
  permissions: PermissionGroup;
  onChange: (name: string, status: boolean) => void;
  canEdit: boolean;
};

export const PermissionResourceGroup: FC<Props> = ({ displayName, resource, permissions, canEdit, onChange }: any) => {
  // Cache the open state of resource in local storage
  const [open, setOpen] = useState<boolean>(() => {
    return localStorage.getItem(`bhd.role.permissions:${resource}`) === 'true';
  });

  const toggle = () => {
    localStorage.setItem(`bhd.role.permissions:${resource}`, `${!open}`);
    setOpen(!open);
  };

  const actions = orderActions(permissions);

  return (
    <>
      <div
        className={css`
          display: flex;
          padding: 10px;
          cursor: pointer;
          justify-content: space-between;
          align-items: center;
          background: #f3f3f3;
          margin: 8px 0;
        `}
        onClick={toggle}
      >
        <div>{displayName}</div>
        <Icon name={open ? 'angle-up' : 'angle-down'} size="md" />
      </div>
      {open && (
        <>
          {actions.map((action) => {
            const name = permissions[action].name;
            const status = permissions[action].status;
            return (
              <div key={`${resource}_${action}`}>
                <Checkbox
                  label={startCase(action)}
                  disabled={!canEdit}
                  checked={status}
                  onChange={(e: React.FormEvent<HTMLInputElement>) => {
                    onChange(name, e.currentTarget.checked);
                  }}
                />
              </div>
            );
          })}
        </>
      )}
    </>
  );
};
