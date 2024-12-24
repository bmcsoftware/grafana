import { forOwn as _forOwn } from 'lodash';

import { config } from '@grafana/runtime';
import { t } from 'app/core/internationalization';
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
      const fL = JSON.parse(featuresList);
      return Object.keys(fL).reduce((acc: any, cur) => {
        acc[getLocalizedFeatures(cur)] = { key: cur, val: fL[cur] };
        return acc;
      }, {});
    } catch (e) {}
  }
  return null;
}

export const FEATURE_CONST = {
  snapshot: 'Snapshot',
  DASHBOARDS_SSRF_FEATURE_NAME: 'bhd-ssrf',
  bmcCrosstabColorOverrid: 'Headers color palette for BMC Cross-tab plugin',
  RBAC: 'bhd-rbac',
  EXPORT_COMPLETE_TABLE: 'Export Complete Table In PDF',
};

const getLocalizedFeatures = (cur: string) => {
  switch (`${cur.toLowerCase().replace(/\s+/g, '-')}`) {
    case 'snapshot':
      return t('bmc.features-list.snapshot', 'Snapshot');
    case 'date-function-resolution-for-service-management':
      return t(
        'bmc.features-list.date-function-resolution-for-service-management',
        'Date function resolution for service management'
      );
    case 'export-complete-table-in-pdf':
      return t('bmc.features-list.export-complete-table-in-pdf', 'Export Complete Table In PDF');
    case 'skip-ootb-dashboards-during-upgrade':
      return t('bmc.features-list.skip-ootb-dashboards-during-upgrade', 'Skip OOTB dashboards during upgrade');
    case 'enable-ootb-views-for-visual-query-builder':
      return t(
        'bmc.features-list.enable-ootb-views-for-visual-query-builder',
        'Enable OOTB Views for Visual Query Builder'
      );
    default:
      return cur;
  }
};
