import React, { Suspense } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { useMount } from 'react-use';

import { VerticalGroup } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import SharedPreferences from 'app/core/components/SharedPreferences/SharedPreferences';
import { StoreState } from 'app/types';

import { getFeatureStatus } from '../dashboard/services/featureFlagSrv';

import UserOrganizations from './UserOrganizations';
import UserProfileEditForm from './UserProfileEditForm';
import UserSessions from './UserSessions';
import { UserTeams } from './UserTeams';
import { changeUserOrg, initUserProfilePage, revokeUserSession, updateUserProfile } from './state/actions';

// BMC code - next line
const GainsightAgreement = React.lazy(() => import('../gainsight/GainsightAgreement'));
export interface OwnProps {}

function mapStateToProps(state: StoreState) {
  const userState = state.user;
  const { user, teams, orgs, sessions, teamsAreLoading, orgsAreLoading, sessionsAreLoading, isUpdating } = userState;
  return {
    orgsAreLoading,
    sessionsAreLoading,
    teamsAreLoading,
    orgs,
    sessions,
    teams,
    isUpdating,
    user,
  };
}

const mapDispatchToProps = {
  initUserProfilePage,
  revokeUserSession,
  changeUserOrg,
  updateUserProfile,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export type Props = OwnProps & ConnectedProps<typeof connector>;

export function UserProfileEditPage({
  orgsAreLoading,
  sessionsAreLoading,
  teamsAreLoading,
  initUserProfilePage,
  orgs,
  sessions,
  teams,
  isUpdating,
  user,
  revokeUserSession,
  changeUserOrg,
  updateUserProfile,
}: Props) {
  useMount(() => initUserProfilePage());

  return (
    <Page navId="profile/settings">
      <Page.Contents isLoading={!user}>
        <VerticalGroup spacing="md">
          <UserProfileEditForm updateProfile={updateUserProfile} isSavingUser={isUpdating} user={user} />
          <SharedPreferences resourceUri="user" />
          {/* BMC code */}
          {getFeatureStatus('gainsight') && (
            <Suspense fallback={<></>}>
              <GainsightAgreement isModal={false}></GainsightAgreement>
            </Suspense>
          )}
          {/* End */}
          <UserTeams isLoading={teamsAreLoading} teams={teams} />
          <UserOrganizations isLoading={orgsAreLoading} setUserOrg={changeUserOrg} orgs={orgs} user={user} />
          <UserSessions isLoading={sessionsAreLoading} revokeUserSession={revokeUserSession} sessions={sessions} />
        </VerticalGroup>
      </Page.Contents>
    </Page>
  );
}

export default connector(UserProfileEditPage);
