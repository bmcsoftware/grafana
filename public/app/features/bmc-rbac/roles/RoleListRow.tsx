import React, { useState } from 'react';

import { locationService } from '@grafana/runtime';
import { Badge, ConfirmModal, Dropdown, Menu, ModalsController, ToolbarButton } from '@grafana/ui';
import { BMCRole } from 'app/types';

import { PermissionListDrawer } from '../permissions/PermissionListDrawer';
import { TeamListDrawer } from '../teams/TeamListDrawer';
import { UserListDrawer } from '../users/UserListDrawer';

type Props = {
  role: BMCRole;
  onDelete: (id: number) => void;
};

export const RoleListRow = ({ role, onDelete }: Props) => {
  return (
    <tr key={role.id}>
      <td className="link-td">
        <div style={{ padding: '0px 8px' }}>{role.name}</div>
      </td>

      <td>
        <div
          style={{
            height: '24px',
            display: 'flex',
          }}
        >
          <Badge
            text={role.systemRole ? 'System' : 'Custom'}
            color={role.systemRole ? 'green' : 'orange'}
            icon={role.systemRole ? 'lock' : 'unlock'}
          />
        </div>
      </td>

      <td className="text-left">
        <ActionMenu role={role} onDelete={onDelete} />
      </td>
    </tr>
  );
};

const onEditRole = (id: number) => {
  locationService.push(`roles/edit/${id}`);
};

export const ActionMenu = ({ role, onDelete }: Props) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menu = (
    <Menu>
      <ModalsController>
        {({ showModal, hideModal }) => {
          return (
            <Menu.Item
              label={'Manage permissions'}
              // size={size}
              onClick={() => {
                showModal(PermissionListDrawer, {
                  role: role,
                  onDismiss: hideModal,
                });
              }}
              // aria-label={selectors.pages.Dashboard.Settings.General.saveDashBoard}
            />
          );
        }}
      </ModalsController>
      <ModalsController>
        {({ showModal, hideModal }) => {
          return (
            <Menu.Item
              label={'Manage users'}
              // size={size}
              onClick={() => {
                showModal(UserListDrawer, {
                  onDismiss: hideModal,
                  role: role,
                });
              }}
              // aria-label={selectors.pages.Dashboard.Settings.General.saveDashBoard}
            />
          );
        }}
      </ModalsController>
      <ModalsController>
        {({ showModal, hideModal }) => {
          return (
            <Menu.Item
              label={'Manage teams'}
              // size={size}
              onClick={() => {
                showModal(TeamListDrawer, {
                  onDismiss: hideModal,
                  role: role,
                });
              }}
              // aria-label={selectors.pages.Dashboard.Settings.General.saveDashBoard}
            />
          );
        }}
      </ModalsController>
      <Menu.Divider />
      <>
        <Menu.Item label="Edit" onClick={() => onEditRole(role.id!)} icon="edit" disabled={role.systemRole} />
        <Menu.Item
          label="Delete"
          onClick={() => setShowDeleteModal(true)}
          icon="trash-alt"
          destructive
          disabled={role.systemRole}
        />
      </>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu}>
        <ToolbarButton title="Menu" icon="ellipsis-v" iconSize="md" narrow />
      </Dropdown>
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete role"
        body="Are you sure you want to delete this role?"
        confirmText="Delete role"
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={() => onDelete(role.id!)}
      />
    </>
  );
};
