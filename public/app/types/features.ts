export interface TenantFeatureDTO {
  Name: string;
  State: string;
  Status: boolean;
  Solution: string;
  Description: string;
  FeatureLevel: string;
  id: number;
  Tenant: string;
}

//Add constant for every feature flag created.
//constant value must be same as feature Name.
export enum DashboardFeatures {}

export const Key_Enabled_Features = 'enabledFeatures';
