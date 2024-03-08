import React, { FC } from 'react';

import { PermissionResourceGroup } from './PermissionResourceGroup';
import { rawToPermissionGroup, orderPermissionsResources } from './state/helpers';
import { Permission } from './state/types';

type Props = {
  permissions: Permission[];
  canEdit: boolean;
  onChange: (id: string, status: boolean) => void;
};

export const PermissionResourceGroupList: FC<Props> = ({ permissions, canEdit, onChange }) => {
  const group = rawToPermissionGroup(permissions);
  const orderedResources = orderPermissionsResources(group);
  return (
    <div
      style={{
        height: 'calc(100% - 48px)',
        overflow: 'auto',
        marginBottom: '20px',
        paddingRight: '8px',
      }}
    >
      {orderedResources.map((resource, i) => {
        const { displayName, ...permissions } = group[resource];
        return (
          <PermissionResourceGroup
            key={`${resource}_${i}`}
            displayName={displayName}
            resource={resource}
            permissions={permissions}
            canEdit={canEdit}
            onChange={(name, status) => {
              onChange(name, status);
            }}
          />
        );
      })}
    </div>
  );
};
