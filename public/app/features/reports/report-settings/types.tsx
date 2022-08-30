export interface ReportSettingDto {
  logoUrl: string;
  footerText: string;
  footerTextUrl: string;
  footerSentBy: boolean;
  whitelistedDomains: string[];
  internalDomainsOnly: boolean;
}
