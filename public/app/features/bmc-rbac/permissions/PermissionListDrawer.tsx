import React, { useState, useEffect, FC } from 'react';

import { Drawer, Button } from '@grafana/ui';
import { BMCRole } from 'app/types';

import { loadRoleDetails } from '../roles/state/actions';

import { PermissionResourceGroupList } from './PermissionResourceGroupList';
import { getPermissions, updatePermissions } from './state/apis';
import { Permission } from './state/types';

type Props = {
  role: BMCRole;
  onDismiss: () => void;
};

export const PermissionListDrawer: FC<Props> = ({ onDismiss, role }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleDetails, setRoleDetails] = useState<BMCRole | undefined>();

  const load = () => {
    Promise.all([loadRoleDetails(role.id!), getPermissions(role.id!)]).then((data: any) => {
      const roleDetails = data[0];
      const permissions = data[1];
      setPermissions(permissions as Permission[]);
      setRoleDetails(roleDetails as BMCRole);
    });
  };

  const update = () => {
    updatePermissions(roleDetails, permissions).then(onDismiss);
  };

  useEffect(load, [role]);

  return (
    <Drawer
      title={`${roleDetails ? roleDetails.name + ' - Permissions' : 'Loading...'}`}
      onClose={onDismiss}
      closeOnMaskClick={false}
      width={'40%'}
      subtitle={'List of permissions'}
      expandable
      scrollableContent={false}
    >
      {roleDetails ? (
        <>
          <PermissionResourceGroupList
            permissions={permissions}
            canEdit={!roleDetails.systemRole}
            onChange={(name, status) => {
              const index = permissions.findIndex((p) => p.name === name);
              if (index === -1) {
                return;
              }
              const perms = [...permissions];
              perms[index].status = status;
              setPermissions(perms);
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'end',
              marginTop: '15px',
            }}
          >
            <Button
              size="md"
              style={{ marginRight: '15px' }}
              variant={'primary'}
              fill="solid"
              onClick={update}
              disabled={role.systemRole}
            >
              Save
            </Button>
            <Button size="md" variant="secondary" fill="solid" onClick={onDismiss}>
              Cancel
            </Button>
          </div>
        </>
      ) : null}
    </Drawer>
  );
};
