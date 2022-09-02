import { GrafanaTheme } from '@grafana/data';
import {
  Button,
  CollapsableSection,
  Field,
  HorizontalGroup,
  Icon,
  Input,
  Label,
  stylesFactory,
  Switch,
  Tooltip,
  useTheme,
} from '@grafana/ui';
import { css } from '@emotion/css';
import React, { FC, ChangeEvent } from 'react';
import { ReportSettingDto } from '../types';
import { CustomTagsInput } from './widgets/CustomTagsInput';

interface Props {
  defaultValues: ReportSettingDto;
  onSubmit: (data: ReportSettingDto) => void;
  onReset: () => void;
}

export const ReportSettingsForm: FC<Props> = ({ defaultValues, onSubmit, onReset }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [settings, setSettings] = React.useState<ReportSettingDto>(() => defaultValues);

  const onLogoChange = (value: string) => setSettings({ ...settings, logoUrl: value });
  const onFooterTextChange = (value: string) => setSettings({ ...settings, footerText: value });
  const onFooterTextUrlChange = (value: string) => setSettings({ ...settings, footerTextUrl: value });
  // const onFooterSentByChange = (value: boolean) => setSettings({ ...settings, footerSentBy: value });
  const onInternalDomainsOnlyChange = (value: boolean) => setSettings({ ...settings, internalDomainsOnly: value });
  const onWhitelistedDomainsChange = (value: string[]) => setSettings({ ...settings, whitelistedDomains: value });

  const companyLogoDesc = 'The logo will be displayed in the document header. Supported formats: png, jpg, jpeg, gif.';
  const defaultLogo = theme.isDark ? 'public/img/bmc_helix_dark.svg' : 'public/img/bmc_helix_light.svg';

  const domainRegExp = /^(([a-zA-Z]{1})|([a-zA-Z]{1}[a-zA-Z]{1})|([a-zA-Z]{1}[0-9]{1})|([0-9]{1}[a-zA-Z]{1})|([a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]))\.([a-zA-Z]{2,6}|[a-zA-Z0-9-]{2,30}\.[a-zA-Z]{2,3})$/i;

  return (
    <div className={styles.formContainer}>
      <div className={styles.formItem}>
        <CollapsableSection label={'Report branding'} isOpen={true}>
          <Field label="Company logo URL">
            <div>
              <Label style={{ fontSize: '10px', color: '#c1c1c175' }}> {companyLogoDesc} </Label>
              <Input
                name="logoUrl"
                value={settings.logoUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  onLogoChange(event.target.value);
                }}
                placeholder={'http://your.site/logo.png'}
              />
            </div>
          </Field>
          <div
            className={styles.reportLogo}
            style={{
              backgroundImage: `url('${settings.logoUrl || defaultLogo}')`,
            }}
          ></div>
          <Field label="Footer text">
            <div>
              <Input
                name="footerText"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  onFooterTextChange(event.target.value);
                }}
                value={settings.footerText}
                placeholder={'BMC Software Inc.'}
              />
            </div>
          </Field>
          <Field label="Footer text URL">
            <div>
              <Input
                name="footerTextUrl"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  onFooterTextUrlChange(event.target.value);
                }}
                value={settings.footerTextUrl}
                placeholder={'http://your.site'}
              />
            </div>
          </Field>
        </CollapsableSection>
        <CollapsableSection label={'Email Security'} isOpen={true}>
          <div
            style={{
              paddingBottom: '16px',
            }}
          >
            <Field
              label={
                <Label>
                  <span className={styles.labelText}>Only internal users</span>
                </Label>
              }
            >
              <HorizontalGroup>
                <Switch
                  value={settings.internalDomainsOnly}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    onInternalDomainsOnlyChange(event.target.checked);
                  }}
                />
                <Tooltip
                  content={
                    settings.internalDomainsOnly ? 'Allow internal users only.' : 'Allow internal and external users.'
                  }
                >
                  <Icon name="info-circle" />
                </Tooltip>
              </HorizontalGroup>
            </Field>
          </div>
          {!settings.internalDomainsOnly && (
            <Field
              label={
                <Label>
                  <span className={styles.labelText}>Allowed domains for external users</span>
                  <Tooltip content="Keeping the list empty will enable all domains by default.">
                    <Icon name="info-circle" />
                  </Tooltip>
                </Label>
              }
              disabled={settings.internalDomainsOnly}
            >
              <CustomTagsInput
                placeholder="domain.xyz"
                tags={settings.whitelistedDomains}
                onValidate={(value) => {
                  let isValid = domainRegExp.test(value);
                  if (!isValid) {
                    return `${value} is not valid domain.`;
                  }
                  if (settings.whitelistedDomains.includes(value)) {
                    return `${value} is already in list.`;
                  }
                  return undefined;
                }}
                onChange={(values: string[]) => {
                  values = values.filter((value: string) => domainRegExp.test(value));
                  var uniq = new Set(values);
                  onWhitelistedDomainsChange(Array.from(uniq));
                }}
              />
            </Field>
          )}
        </CollapsableSection>
      </div>
      <div className={styles.formButtons}>
        <HorizontalGroup>
          <Button
            type="submit"
            onClick={() => {
              onSubmit(settings);
            }}
          >
            Save
          </Button>
          <a href={'reports'}>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </a>
          <Button type="reset" variant="destructive" onClick={onReset}>
            Reset
          </Button>
        </HorizontalGroup>
      </div>
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    formContainer: css``,
    formItem: css`
      flex-grow: 1;
      padding-top: ${theme.spacing.md};
      padding-bottom: ${theme.spacing.xs};
    `,
    formButtons: css`
      padding-top: ${theme.spacing.xl};
    `,
    reportLogo: css`
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      background-origin: content-box;
      height: 100px;
      width: 300px;
      padding: 12px;
      border: 1px ${theme.colors.formInputBorder} solid;
      border-radius: 2px;
      margin: 0 0 16px 0;
    `,
    addButtonStyle: css`
      margin: 0 -${theme.spacing.sm};
    `,
    labelText: css`
      margin-right: 6px;
    `,
  };
});
