import { backendSrv } from 'app/core/services/backend_srv';
import { isOrgAdmin } from 'app/features/plugins/admin/permissions';

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
  tenant_domain_name?: string;
}

export interface Preference {
  key: string;
  level: string;
  value: string;
  status?: string;
}

interface GainSightData {
  gsTag?: string;
  canShareUserPII?: boolean;
  preferences?: Preference[];
  tenantDomainName?: string;
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
  const tenantDomainName = (result as UserInfo).tenant_domain_name;

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
    tenantDomainName,
  };
};

export const autoUpdateGainsightUserPreferences = async (preferences: Preference[]): Promise<Preference[] | undefined> => {
  const userPreferences = generatePreferencesForAutoUpdate(preferences);
  if (!userPreferences.length) {
    return;
  }
  const prefStatus = (await setImsUserPreferences(userPreferences));
  if (prefStatus?.some((pref: Preference) => pref.level === 'USER' && pref.status === 'OK')) {
    return [...preferences, ...userPreferences];
  }
  return;
};

const generatePreferencesForAutoUpdate = (preferences: Preference[]): Preference[] => {
  const userConsentForQuality = preferences.find(
    (pref) => pref.key === 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT' && pref.level === 'USER'
  );
  const tenantConsentForQuality = preferences.find(
    (pref) => pref.key === 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT' && pref.level === 'TENANT'
  );

  if (userConsentForQuality) {
    const trackUsage = preferences.find((pref) => pref.key === 'GS_TRACK_USAGE');
    if (!trackUsage) {
      return [
        {
          key: 'GS_TRACK_USAGE',
          level: 'USER',
          value: userConsentForQuality.value,
        },
      ];
    } else {
      return [];
    }
  } else if (!tenantConsentForQuality) {
    const opsConsentForQuality = preferences.find(
      (pref) => pref.key === 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT' && pref.level === 'OPS'
    );

    if (opsConsentForQuality && opsConsentForQuality.value !== 'ask') {
      const opsConsentForOutreach = preferences.find(
        (pref) => pref.key === 'GS_DATA_COLLECTION_FOR_OUTREACH_CONSENT' && pref.level === 'OPS'
      );

      return [
        {
          key: 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT',
          level: 'USER',
          value: opsConsentForQuality?.value,
        },
        {
          key: 'GS_DATA_COLLECTION_FOR_OUTREACH_CONSENT',
          level: 'USER',
          value: opsConsentForOutreach?.value ?? 'false',
        },
        {
          key: 'GS_TRACK_USAGE',
          level: 'USER',
          value: opsConsentForQuality?.value,
        },
      ];
    } else if (!isOrgAdmin() || !opsConsentForQuality) {
      // avoid setting the same track usage again
      const trackUsage = preferences.find((pref) => pref.key === 'GS_TRACK_USAGE');
      if (trackUsage?.value === 'false') {
        return [];
      } 
      // only auto update to false when its a non-admin user
      // for admin user there is pop up modal that will appear and track usage will be set on opt-in/opt-out
      return [
        {
          key: 'GS_TRACK_USAGE',
          level: 'USER',
          value: 'false',
        },
      ];
    } else {
      return [];
    }
  } else {
    const tenantConsentForOutreach = preferences.find(
      (pref) => pref.key === 'GS_DATA_COLLECTION_FOR_OUTREACH_CONSENT' && pref.level === 'TENANT'
    );

    return [
      {
        key: 'GS_DATA_COLLECTION_FOR_QUALITY_CONSENT',
        level: 'USER',
        value: tenantConsentForQuality?.value,
      },
      {
        key: 'GS_DATA_COLLECTION_FOR_OUTREACH_CONSENT',
        level: 'USER',
        value: tenantConsentForOutreach?.value ?? 'false',
      },
      {
        key: 'GS_TRACK_USAGE',
        level: 'USER',
        value: tenantConsentForQuality?.value,
      },
    ];
  }
};
