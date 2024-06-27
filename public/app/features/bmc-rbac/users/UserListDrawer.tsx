import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { Button, Drawer } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { BMCRole, StoreState } from 'app/types';

import { UsersActionBar } from './UsersActionBar';
import { UsersTable } from './UsersTable';
import { checkStatusChanged, clearState, loadUsers, postUsers, selectAllStatusChanged } from './state/actions';
import { getUsersSearchQuery } from './state/selectors';

function mapStateToProps(state: StoreState) {
  const searchQuery = getUsersSearchQuery(state.rbacUsers);
  return {
    users: state.rbacUsers.users,
    searchQuery: searchQuery,
    selectedCount: state.rbacUsers.selectedCount,
    perPage: state.rbacUsers.perPage,
    isLoading: state.rbacUsers.isLoading,
    usersAdded: state.rbacUsers.usersAdded,
    usersRemoved: state.rbacUsers.usersRemoved,
  };
}

const mapDispatchToProps = {
  loadUsers,
  checkStatusChanged,
  selectAllStatusChanged,
  clearState,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type Props = { role: BMCRole; onDismiss: () => void } & ConnectedProps<typeof connector>;

export const UsersListPageContent = ({
  users,
  selectedCount,
  isLoading,
  usersAdded,
  usersRemoved,
  loadUsers,
  checkStatusChanged,
  selectAllStatusChanged,
  clearState,
  role,
  onDismiss,
}: Props): JSX.Element => {
  useEffect(() => {
    loadUsers(role.id!);
  }, [loadUsers, role.id]);

  // const pageRef = React.useRef<HTMLDivElement>(null);
  // const actionBarRef = React.useRef<HTMLDivElement>(null);
  // const actionBtnRef = React.useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState<boolean>(false);

  const renderTable = () => {
    return users?.length ? (
      <UsersTable
        users={users}
        roleId={role.id!}
        onUserCheckboxChange={checkStatusChanged}
        onSelectAllChange={selectAllStatusChanged}
      />
    ) : (
      <div
        className={css`
          text-align: center;
        `}
      >
        No users found
      </div>
    );
  };

  const submitUsers = () => {
    setSubmitted(true);
    postUsers(role.id!, usersAdded, usersRemoved)
      .then((resp) => {
        clearState();
        onDismiss();
      })
      // TODO: catch errors
      .finally(() => {
        setSubmitted(false);
      });
  };

  const onClose = () => {
    clearState();
    onDismiss();
  };

  return (
    <>
      <UsersActionBar roleId={role.id!} selectedCount={selectedCount} />
      <Page.Contents isLoading={isLoading}>
        {!isLoading && renderTable()}
        {users?.length ? (
          <div
            className={css`
              display: flex;
              justify-content: end;
              margin-top: 15px;
            `}
          >
            <Button
              size="md"
              style={{ marginRight: '15px' }}
              variant={'primary'}
              fill="solid"
              icon={submitted ? 'fa fa-spinner' : undefined}
              onClick={submitUsers}
              disabled={submitted || (!usersAdded.length && !usersRemoved.length)}
            >
              {' '}
              Save
            </Button>
            <Button size="md" variant="secondary" fill="solid" onClick={onClose}>
              {' '}
              Cancel
            </Button>
          </div>
        ) : (
          <></>
        )}
      </Page.Contents>
    </>
  );
};

const UserListDrawerUnconnected = (props: Props) => {
  const selectedCountText =
    props.selectedCount === 0
      ? 'No users assigned'
      : props.selectedCount
      ? `${props.selectedCount} ${props.selectedCount > 1 ? 'users' : 'user'} assigned`
      : 'Loading...';

  return (
    <Drawer
      title={`${props.role.name} - Users`}
      onClose={() => {
        props.clearState();
        props.onDismiss();
      }}
      closeOnMaskClick={false}
      width={'40%'}
      subtitle={selectedCountText}
      expandable
      scrollableContent
    >
      <UsersListPageContent {...props} />
    </Drawer>
  );
};

export const UserListDrawer = connector(UserListDrawerUnconnected);
