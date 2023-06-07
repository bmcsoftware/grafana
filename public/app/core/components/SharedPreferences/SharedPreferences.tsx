import { css } from '@emotion/css';
import React, { PureComponent } from 'react';

import { FeatureState, SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';
import {
  Button,
  Field,
  FieldSet,
  Form,
  Label,
  RadioButtonGroup,
  Select,
  stylesFactory,
  TimeZonePicker,
  WeekStartPicker,
  FeatureBadge,
} from '@grafana/ui';
import { DashboardPicker } from 'app/core/components/Select/DashboardPicker';
import { contextSrv } from 'app/core/core';
import { t, Trans } from 'app/core/internationalization';
import { LOCALES } from 'app/core/internationalization/constants';
import { PreferencesService } from 'app/core/services/PreferencesService';
import { getFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';
import { OrgCustomConfiguration } from 'app/features/org/OrgCustomConfiguration';
import { customConfigSrv, FEATURE_FLAG_CONFIGURABLE_LINK } from 'app/features/org/state/configuration';
import { UserPreferencesDTO } from 'app/types';

export interface Props {
  resourceUri: string;
  disabled?: boolean;
  onConfirm?: () => Promise<boolean>;
}

export type State = UserPreferencesDTO;

const themes: SelectableValue[] = [
  { value: '', label: t('shared-preferences.theme.default-label', 'Default') },
  { value: 'dark', label: t('shared-preferences.theme.dark-label', 'Dark') },
  { value: 'light', label: t('shared-preferences.theme.light-label', 'Light') },
];

function getLanguageOptions(): Array<SelectableValue<string>> {
  const languageOptions = LOCALES.map((v) => ({
    value: v.code,
    label: v.name,
  }));

  const options = [
    {
      value: '',
      label: t('common.locale.default', 'Default'),
    },
    ...languageOptions,
  ];

  return options;
}

const i18nFlag = Boolean(config.featureToggles.internationalization);

export class SharedPreferences extends PureComponent<Props, State> {
  service: PreferencesService;

  constructor(props: Props) {
    super(props);

    this.service = new PreferencesService(props.resourceUri);
    this.state = {
      theme: '',
      timezone: '',
      weekStart: '',
      locale: '',
      queryHistory: { homeTab: '' },
      // BMC code
      docLink: '',
      supportLink: '',
      communityLink: '',
      videoLink: '',
      // End
    };
  }

  async componentDidMount() {
    const prefs = await this.service.load();

    // BMC code - next line
    let config = await customConfigSrv.getCustomConfiguration();
    this.setState({
      homeDashboardUID: prefs.homeDashboardUID,
      theme: prefs.theme,
      timezone: prefs.timezone,
      weekStart: prefs.weekStart,
      locale: prefs.locale,
      queryHistory: prefs.queryHistory,
      // BMC code
      communityLink: config.communityLink,
      docLink: config.docLink,
      supportLink: config.supportLink,
      videoLink: config.videoLink,
      // End
    });
  }

  onSubmitForm = async () => {
    const confirmationResult = this.props.onConfirm ? await this.props.onConfirm() : true;

    if (confirmationResult) {
      // BMC code - inline change
      const {
        homeDashboardUID,
        theme,
        timezone,
        weekStart,
        locale,
        queryHistory,
        communityLink,
        docLink,
        supportLink,
        videoLink,
      } = this.state;
      await this.service.update({
        homeDashboardUID,
        theme,
        timezone,
        weekStart,
        locale,
        queryHistory,
        communityLink,
        docLink,
        supportLink,
        videoLink,
      });
      // End
      // window.location.reload();
    }
  };

  onThemeChanged = (value: string) => {
    this.setState({ theme: value });
  };

  onTimeZoneChanged = (timezone?: string) => {
    if (!timezone) {
      return;
    }
    this.setState({ timezone: timezone });
  };

  onWeekStartChanged = (weekStart: string) => {
    this.setState({ weekStart: weekStart });
  };

  onHomeDashboardChanged = (dashboardUID: string) => {
    this.setState({ homeDashboardUID: dashboardUID });
  };

  onLocaleChanged = (locale: string) => {
    this.setState({ locale });
  };

  // BMC code
  onDocLinkChange = (event: any) => {
    this.setState({ docLink: event.target.value });
  };

  onCommunityLinkChange = (event: any) => {
    this.setState({ communityLink: event.target.value });
  };

  onSupportLinkChange = (event: any) => {
    this.setState({ supportLink: event.target.value });
  };

  onVideoLinkChange = (event: any) => {
    this.setState({ videoLink: event.target.value });
  };

  onSubmitConfiguration = async () => {
    if (this.props.resourceUri !== 'org') {
      return;
    }
    const config = this.state;
    await customConfigSrv.setCustomConfiguration({
      docLink: config.docLink,
      supportLink: config.supportLink,
      communityLink: config.communityLink,
      videoLink: config.videoLink,
    });
  };

  onSubmitFormCustom = async () => {
    await this.onSubmitForm();
    await this.onSubmitConfiguration();
    window.location.reload();
  };
  // End
  render() {
    const { theme, timezone, weekStart, homeDashboardUID, locale } = this.state;
    const { disabled } = this.props;
    const styles = getStyles();
    const languages = getLanguageOptions();

    return (
      // BMC code - inline change
      <Form onSubmit={this.onSubmitFormCustom}>
        {/* BMC code - inline change */}
        {(form) => {
          return (
            <FieldSet label={<Trans i18nKey="shared-preferences.title">Preferences</Trans>} disabled={disabled}>
              <Field label={t('shared-preferences.fields.theme-label', 'UI Theme')}>
                <RadioButtonGroup
                  options={themes}
                  value={themes.find((item) => item.value === theme)?.value}
                  onChange={this.onThemeChanged}
                />
              </Field>

              <Field
                label={
                  <Label htmlFor="home-dashboard-select">
                    <span className={styles.labelText}>
                      <Trans i18nKey="shared-preferences.fields.home-dashboard-label">Home Dashboard</Trans>
                    </span>
                  </Label>
                }
                data-testid="User preferences home dashboard drop down"
              >
                <DashboardPicker
                  value={homeDashboardUID}
                  onChange={(v) => this.onHomeDashboardChanged(v?.uid ?? '')}
                  defaultOptions={true}
                  isClearable={true}
                  placeholder={t('shared-preferences.fields.home-dashboard-placeholder', 'Default dashboard')}
                  inputId="home-dashboard-select"
                />
              </Field>

              <Field
                label={t('shared-dashboard.fields.timezone-label', 'Timezone')}
                data-testid={selectors.components.TimeZonePicker.containerV2}
              >
                <TimeZonePicker
                  includeInternal={true}
                  value={timezone}
                  onChange={this.onTimeZoneChanged}
                  inputId="shared-preferences-timezone-picker"
                />
              </Field>

              <Field
                label={t('shared-preferences.fields.week-start-label', 'Week start')}
                data-testid={selectors.components.WeekStartPicker.containerV2}
              >
                <WeekStartPicker
                  value={weekStart}
                  onChange={this.onWeekStartChanged}
                  inputId={'shared-preferences-week-start-picker'}
                />
              </Field>

              {i18nFlag ? (
                <Field
                  label={
                    <Label htmlFor="locale-select">
                      <span className={styles.labelText}>
                        <Trans i18nKey="shared-preferences.fields.locale-label">Language</Trans>
                      </span>
                      <FeatureBadge featureState={FeatureState.beta} />
                    </Label>
                  }
                  data-testid="User preferences language drop down"
                >
                  <Select
                    value={languages.find((lang) => lang.value === locale)}
                    onChange={(locale: SelectableValue<string>) => this.onLocaleChanged(locale.value ?? '')}
                    options={languages}
                    placeholder={t('shared-preferences.fields.locale-placeholder', 'Choose language')}
                    inputId="locale-select"
                  />
                </Field>
              ) : null}

              {/* BMC code */}
              {this.props.resourceUri === 'org' && getFeatureStatus(FEATURE_FLAG_CONFIGURABLE_LINK) && (
                <OrgCustomConfiguration
                  onDocLinkChange={this.onDocLinkChange}
                  onCommunityLinkChange={this.onCommunityLinkChange}
                  onSupportLinkChange={this.onSupportLinkChange}
                  onVideoLinkChange={this.onVideoLinkChange}
                  communityLink={this.state.communityLink}
                  docLink={this.state.docLink}
                  supportLink={this.state.supportLink}
                  videoLink={this.state.videoLink}
                  {...form}
                />
              )}

              {(!contextSrv.isGrafanaAdmin || this.props.resourceUri === 'org') && (
                <div className="gf-form-button-row">
                  <Button
                    type="submit"
                    variant="primary"
                    data-testid={selectors.components.UserProfile.preferencesSaveButton}
                  >
                    <Trans i18nKey="common.save">Save</Trans>
                  </Button>
                </div>
              )}
              {/* End */}
            </FieldSet>
          );
        }}
      </Form>
    );
  }
}

export default SharedPreferences;

const getStyles = stylesFactory(() => {
  return {
    labelText: css`
      margin-right: 6px;
    `,
  };
});
