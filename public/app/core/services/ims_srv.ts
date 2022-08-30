import { backendSrv } from 'app/core/services/backend_srv';

export interface UserInfo {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  principal_id: string;
  email: string;
  user_status: string;
  type: string;
  auth_type: string;
  tenant_id: string;
  tenant_name: string;
  roles: string[];
  groups: string[];
  permissions: string[];
  preferences: Preference[];
}

export interface Preference {
  key: string;
  level: string;
  value: string;
}

interface GainSightData {
  gsTag?: string;
  canShareUserPII?: boolean;
  preferences?: Preference[];
}

export const getImsUserInfo = async (): Promise<UserInfo | any> => {
  const response = await backendSrv.get<UserInfo>(`/ims/userinfo`);
  return response;
};

export const setImsUserPreferences = async (payload: Preference[]): Promise<any> => {
  const response = await backendSrv.post(`/ims/users/preferences`, payload);
  return response;
};

export const getGainsightData = async (): Promise<GainSightData> => {
  const result = await getImsUserInfo();
  if (!result) {
    return {};
  }
  const preferences = (result as UserInfo).preferences;

  const userQualityConsent =
    preferences
      .find((p: Preference) => p.key === 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT' && p.level === 'USER')
      ?.value?.toString() === 'true';
  const userOutreachConsent =
    preferences
      .find((p: Preference) => p.key === 'GS_DATA_COLLECTION_FOR_OUTREACH_CONSENT' && p.level === 'USER')
      ?.value?.toString() === 'true';
  const teanantQualityConsent =
    preferences
      .find((p: Preference) => p.key === 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT' && p.level === 'TENANT')
      ?.value?.toString() === 'true';
  const tenantOutreachConsent =
    preferences
      .find((p: Preference) => p.key === 'GS_DATA_COLLECTION_FOR_OUTREACH_CONSENT' && p.level === 'TENANT')
      ?.value?.toString() === 'true';

  const gsTag = preferences.find((p: Preference) => p.key === 'GS_TAG')?.value;

  // Todo: What is the condition that verifies if the used has opted-in?
  const canShareUserPII = teanantQualityConsent && userQualityConsent && userOutreachConsent && tenantOutreachConsent;

  return {
    gsTag,
    canShareUserPII,
    preferences,
  };
};
