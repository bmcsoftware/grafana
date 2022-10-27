import React from 'react';

import { Permissions } from 'app/core/components/AccessControl';
// import { contextSrv } from 'app/core/services/context_srv';

import { Team } from '../../types';

type TeamPermissionsProps = {
  team: Team;
};

// TeamPermissions component replaces TeamMembers component when the accesscontrol feature flag is set
const TeamPermissions = (props: TeamPermissionsProps) => {
  // BMC Code: Comment below
  // const canSetPermissions = contextSrv.hasPermissionInMetadata(
  //   AccessControlAction.ActionTeamsPermissionsWrite,
  //   props.team
  // );

  return (
    <Permissions
      title="Members"
      addPermissionTitle="Add member"
      buttonLabel="Add member"
      resource="teams"
      resourceId={props.team.id}
      canSetPermissions={false}
    />
  );
};

export default TeamPermissions;
