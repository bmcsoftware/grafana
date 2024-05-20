import { css } from '@emotion/css';
import React, { PureComponent } from 'react';

import { FeatureState, SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config, reportInteraction, getDataSourceSrv } from '@grafana/runtime';
import { Preferences as UserPreferencesDTO } from '@grafana/schema/src/raw/preferences/x/preferences_types.gen';
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
import { Trans, t } from 'app/core/internationalization';
import { LANGUAGES } from 'app/core/internationalization/constants';
import { PreferencesService } from 'app/core/services/PreferencesService';
import { getFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';
import { OrgCustomConfiguration } from 'app/features/org/OrgCustomConfiguration';
import { FEATURE_FLAG_CONFIGURABLE_LINK, customConfigSrv } from 'app/features/org/state/configuration';

import { CustomDateFormatPicker } from './CustomSharedPreferences';

export interface Props {
  resourceUri: string;
  disabled?: boolean;
  preferenceType: 'org' | 'team' | 'user';
  onConfirm?: () => Promise<boolean>;
}

// BMC code
export interface BMCUserPreferencesDTO extends UserPreferencesDTO {
  docLink?: string;
  supportLink?: string;
  communityLink?: string;
  videoLink?: string;
  queryType?: string;
  defaultDataSource?: any;
  timeFormat?: string;
}
// end

// BMC code - inline change
export type State = BMCUserPreferencesDTO;

function getLanguageOptions(): Array<SelectableValue<string>> {
  const languageOptions = LANGUAGES.map((v) => ({
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
  themeOptions: SelectableValue[];

  constructor(props: Props) {
    super(props);

    this.service = new PreferencesService(props.resourceUri);
    this.state = {
      theme: '',
      timezone: '',
      weekStart: '',
      language: '',
      queryHistory: { homeTab: '' },
      // BMC code
      docLink: '',
      supportLink: '',
      communityLink: '',
      videoLink: '',
      queryType: '',
      timeFormat: '',
      // End
    };

    this.themeOptions = [
      { value: '', label: t('shared-preferences.theme.default-label', 'Default') },
      { value: 'dark', label: t('shared-preferences.theme.dark-label', 'Dark') },
      { value: 'light', label: t('shared-preferences.theme.light-label', 'Light') },
      { value: 'system', label: t('shared-preferences.theme.system-label', 'System') },
    ];
  }

  async componentDidMount() {
    // BMC code: rewritten logic for whole did mount
    const res = await Promise.all([
      this.service.load(),
      customConfigSrv.getCustomConfiguration(),
      getDataSourceSrv()
        .get('BMC Helix')
        .catch(() => null),
    ]).then((result) => {
      return {
        ...result[0],
        ...result[1],
        ds: result[2],
      };
    });
    // BMC code end

    this.setState({
      homeDashboardUID: res.homeDashboardUID,
      theme: res.theme,
      timezone: res.timezone,
      weekStart: res.weekStart,
      language: res.language,
      queryHistory: res.queryHistory,
      // BMC code
      communityLink: res.communityLink,
      docLink: res.docLink,
      supportLink: res.supportLink,
      videoLink: res.videoLink,
      queryType: res.queryType,
      defaultDataSource: res.ds,
      timeFormat: res.timeFormat ? res.timeFormat : '',
      // End
    });
  }

  onSubmitForm = async () => {
    // BMC code - comment below line, if statement and reload as we are doing this check in onSubmitFormCustom
    // const confirmationResult = this.props.onConfirm ? await this.props.onConfirm() : true;

    // if (confirmationResult) {
    const { homeDashboardUID, theme, timezone, weekStart, language, queryHistory, timeFormat } = this.state;
    await this.service.update({
      homeDashboardUID,
      theme,
      timezone,
      weekStart,
      language,
      queryHistory,
      timeFormat,
    });
    // window.location.reload();
    // }
    // BMC code - end
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

  onLanguageChanged = (language: string) => {
    this.setState({ language });

    reportInteraction('grafana_preferences_language_changed', {
      toLanguage: language,
      preferenceType: this.props.preferenceType,
    });
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

  onQueryChanged = (queryType: string) => {
    this.setState({ queryType });
  };

  onTimeFormatChanged = (timeFormat: string) => {
    this.setState({ timeFormat });
  };

  onSubmitConfiguration = async () => {
    if (this.props.resourceUri !== 'org') {
      return;
    }
    const config = this.state;
    await customConfigSrv.setCustomConfiguration({
      docLink: config.docLink ?? '',
      supportLink: config.supportLink ?? '',
      communityLink: config.communityLink ?? '',
      videoLink: config.videoLink ?? '',
      queryType: config.queryType ?? '',
    });
  };

  onSubmitFormCustom = async () => {
    const confirmationResult = this.props.onConfirm ? await this.props.onConfirm() : true;

    if (confirmationResult) {
      await this.onSubmitForm();
      await this.onSubmitConfiguration();
      window.location.reload();
    }
  };
  // End

  render() {
    const { theme, timezone, weekStart, homeDashboardUID, language, queryType } = this.state;
    const { disabled } = this.props;
    const styles = getStyles();
    const languages = getLanguageOptions();
    let currentThemeOption = this.themeOptions[0].value;
    if (theme?.length) {
      currentThemeOption = this.themeOptions.find((item) => item.value === theme)?.value;
    }

    return (
      // BMC code - inline change
      <Form onSubmit={this.onSubmitFormCustom}>
        {(form) => {
          return (
            <FieldSet label={<Trans i18nKey="shared-preferences.title">Preferences</Trans>} disabled={disabled}>
              <Field label={t('shared-preferences.fields.theme-label', 'UI Theme')}>
                <RadioButtonGroup
                  options={this.themeOptions}
                  value={currentThemeOption}
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
                  value={weekStart || ''}
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
                    value={languages.find((lang) => lang.value === language)}
                    onChange={(lang: SelectableValue<string>) => this.onLanguageChanged(lang.value ?? '')}
                    options={languages}
                    placeholder={t('shared-preferences.fields.locale-placeholder', 'Choose language')}
                    inputId="locale-select"
                  />
                </Field>
              ) : null}

              {this.props.resourceUri === 'org' && this.state.defaultDataSource ? (
                <Field
                  label={
                    <Label htmlFor="default-query">
                      <span className={styles.labelText}>
                        <Trans i18nKey="shared-preferences.fields.query-type-label">Query Type</Trans>
                      </span>
                    </Label>
                  }
                  data-testid="Default Query Type Drop Down"
                >
                  <Select
                    value={this.state.defaultDataSource.queryTypeOptions?.find(
                      (query: any) => query.value === queryType
                    )}
                    onChange={(query: SelectableValue<string>) => this.onQueryChanged(query.value ?? '')}
                    options={this.state.defaultDataSource.queryTypeOptions}
                    placeholder={t('shared-preferences.fields.query-type-placeholder', 'Choose query type')}
                    inputId="default-query"
                  />
                </Field>
              ) : null}

              <CustomDateFormatPicker
                value={this.state.timeFormat}
                onChange={(value: string) => this.onTimeFormatChanged(value)}
                resourceUri={this.props.resourceUri}
              />

              {/* BMC code - start */}
              {this.props.resourceUri === 'org' && getFeatureStatus(FEATURE_FLAG_CONFIGURABLE_LINK) && (
                <OrgCustomConfiguration
                  onDocLinkChange={this.onDocLinkChange}
                  onCommunityLinkChange={this.onCommunityLinkChange}
                  onSupportLinkChange={this.onSupportLinkChange}
                  onVideoLinkChange={this.onVideoLinkChange}
                  communityLink={this.state.communityLink ?? ''}
                  docLink={this.state.docLink ?? ''}
                  supportLink={this.state.supportLink ?? ''}
                  videoLink={this.state.videoLink ?? ''}
                  {...form}
                />
              )}
              {/* BMC code - end */}

              <div className="gf-form-button-row">
                <Button
                  type="submit"
                  variant="primary"
                  data-testid={selectors.components.UserProfile.preferencesSaveButton}
                >
                  <Trans i18nKey="common.save">Save</Trans>
                </Button>
              </div>
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
