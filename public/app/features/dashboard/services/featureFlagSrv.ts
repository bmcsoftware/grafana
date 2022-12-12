import { forOwn as _forOwn } from 'lodash';

import { config } from '@grafana/runtime';
import { backendSrv } from 'app/core/services/backend_srv';
import { contextSrv } from 'app/core/services/context_srv';
import {
  Key_Enabled_Features,
  TenantFeatureDTO,
  GrafanaFeatureDTO,
  Key_Grafana_Enabled_Feature,
  Key_Features_List,
} from 'app/types/features';

export function getFeatureStatus(featureName: string) {
  // if feature flag set to false, return true to allow the feature.
  if (!config.FeatureFlagEnabled) {
    return true;
  }

  // if local storage exist and contain the provided feature return true (to enable the feature), otherwise return false to hide this feature.
  const KeyEnabledFeatures = localStorage.getItem(Key_Enabled_Features);
  if (KeyEnabledFeatures && KeyEnabledFeatures.includes(featureName)) {
    return true;
  } else {
    return false;
  }
}

export function loadFeatures(tenantFeature: TenantFeatureDTO[] | null) {
  let enabledFeatures: string[] = [];
  if (tenantFeature != null) {
    tenantFeature.map((feature) => {
      if (feature.Status && !enabledFeatures.includes(feature.Name)) {
        enabledFeatures.push(feature.Name);
      }
    });
  }
  localStorage.setItem(Key_Enabled_Features, JSON.stringify(enabledFeatures));
}

export async function loadGrafanaFeatures() {
  const enabledFeatures: string[] = [];
  const featureMap: { [key: string]: boolean } = {};
  let resp: GrafanaFeatureDTO[] = await backendSrv.get('/api/org/featurestatus');
  resp = resp.filter((item: GrafanaFeatureDTO) => {
    if (item.orgId === contextSrv.user.orgId) {
      featureMap[item.featureName] = item.status;
      return 0;
    }
    return 1;
  });
  resp.forEach((item: GrafanaFeatureDTO) => {
    if (!featureMap.hasOwnProperty(item.featureName)) {
      featureMap[item.featureName] = item.status;
    }
  });
  _forOwn(featureMap, (val: boolean, key: string) => {
    if (val) {
      enabledFeatures.push(key);
    }
  });
  localStorage.setItem(Key_Grafana_Enabled_Feature, JSON.stringify(enabledFeatures));
  localStorage.setItem(Key_Features_List, JSON.stringify(featureMap));
  return;
}

export function getGrafanaFeatureStatus(featureName: string) {
  const enabledFeatures = localStorage.getItem(Key_Grafana_Enabled_Feature);
  return enabledFeatures && enabledFeatures.includes(featureName) ? true : false;
}

export function updateFeatureStatus(data: any) {
  return backendSrv.put('/api/org/featurestatus', data);
}

export function getGrafanaFeaturesList() {
  const featuresList = localStorage.getItem(Key_Features_List);
  if (featuresList) {
    try {
      return JSON.parse(featuresList);
    } catch (e) {}
  }
  return null;
}

export const FEATURE_CONST = {
  snapshot: 'Snapshot',
  DASHBOARDS_SSRF_FEATURE_NAME: 'bhd-ssrf',
};
