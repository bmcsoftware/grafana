import { config } from '@grafana/runtime';
import { Key_Enabled_Features, TenantFeatureDTO } from 'app/types/features';

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
