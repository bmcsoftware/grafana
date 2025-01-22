import { css } from '@emotion/css';
import React, { PureComponent } from 'react';

import { AppEvents, FeatureState, SelectableValue, getBuiltInThemes, ThemeRegistryItem } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config, reportInteraction, getDataSourceSrv } from '@grafana/runtime';
import { Preferences as UserPreferencesDTO } from '@grafana/schema/src/raw/preferences/x/preferences_types.gen';
import {
  Button,
  Field,
  FieldSet,
  Label,
  Select,
  stylesFactory,
  TimeZonePicker,
  WeekStartPicker,
  FeatureBadge,
  InlineFieldRow,
  InlineField,
  InlineSwitch,
  Checkbox,
} from '@grafana/ui';
import { DashboardPicker } from 'app/core/components/Select/DashboardPicker';
import { appEvents } from 'app/core/core';
import { Trans, t } from 'app/core/internationalization';
import { LANGUAGES } from 'app/core/internationalization/constants';
import { PreferencesService } from 'app/core/services/PreferencesService';
import { changeTheme } from 'app/core/services/theme';
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
export interface EnabledQueryTypes {
  enabledTypes: string[];
  applyForAdmin: boolean;
}

export interface BMCUserPreferencesDTO extends UserPreferencesDTO {
  docLink?: string;
  supportLink?: string;
  communityLink?: string;
  videoLink?: string;
  queryType?: string;
  defaultDataSource?: any;
  timeFormat?: string;
  enabledQueryTypes?: EnabledQueryTypes;
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
      enabledQueryTypes: { enabledTypes: [], applyForAdmin: false },
      // End
    };

    this.themeOptions = getBuiltInThemes(config.featureToggles.extraThemes).map((theme) => ({
      value: theme.id,
      label: getTranslatedThemeName(theme),
    }));

    // Add default option
    this.themeOptions.unshift({ value: '', label: t('shared-preferences.theme.default-label', 'Default') });
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

    // handling when preferece is never set, which also means all query types are enabled
    const defaultQueryTypes = { enabledTypes: ['FORM', 'SQL', 'VQB'], applyForAdmin: false };
    const enabledQueryTypes = res.enabledQueryTypes?.enabledTypes.length ? res.enabledQueryTypes : defaultQueryTypes;

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
      enabledQueryTypes: enabledQueryTypes,
      // End
    });
  }

  onSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    // BMC code - comment below line, if statement and reload as we are doing this check in onSubmitFormCustom
    // event.preventDefault();
    // const confirmationResult = this.props.onConfirm ? await this.props.onConfirm() : true;

    // if (confirmationResult) {
    const { homeDashboardUID, theme, timezone, weekStart, language, queryHistory, timeFormat, enabledQueryTypes } =
      this.state;
    await this.service.update({
      homeDashboardUID,
      theme,
      timezone,
      weekStart,
      language,
      queryHistory,
      timeFormat,
      enabledQueryTypes,
    });
    // window.location.reload();
    // }
    // BMC code - end
  };

  onThemeChanged = (value: SelectableValue<string>) => {
    this.setState({ theme: value.value });

    if (value.value) {
      changeTheme(value.value, true);
    }
  };

  onTimeZoneChanged = (timezone?: string) => {
    if (typeof timezone !== 'string') {
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

  onEnabledQueryTypesChanged = (checked: boolean, type: string) => {
    console.log(checked, type);
    const { enabledTypes, applyForAdmin } = this.state.enabledQueryTypes!;
    let newEnabledTypes = [...enabledTypes]; // Create a copy of enabledTypes

    // Update applyForAdmin based on type
    const newApplyForAdmin = type === 'admin' ? checked : applyForAdmin;

    // Update newEnabledTypes based on type and checked status
    if (type !== 'admin') {
      if (checked) {
        newEnabledTypes.push(type.toUpperCase());
      } else {
        // at least one type should be enabled
        if (newEnabledTypes.length === 1) {
          appEvents.emit(AppEvents.alertWarning, [
            t('bmc.org-custom-config.errors.query-type-mandatory', 'At least one query type should be enabled'),
          ]);
          return;
        }
        newEnabledTypes = newEnabledTypes.filter((e) => e !== type.toUpperCase());
      }
    }

    // Update state
    this.setState({ enabledQueryTypes: { enabledTypes: newEnabledTypes, applyForAdmin: newApplyForAdmin } });
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

  onSubmitFormCustom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmationResult = this.props.onConfirm ? await this.props.onConfirm() : true;

    if (confirmationResult) {
      await this.onSubmitForm(event);
      await this.onSubmitConfiguration();
      window.location.reload();
    }
  };
  // End

  render() {
    const { theme, timezone, weekStart, homeDashboardUID, language, queryType, enabledQueryTypes } = this.state;
    const { disabled } = this.props;
    const styles = getStyles();
    const languages = getLanguageOptions();
    const currentThemeOption = this.themeOptions.find((x) => x.value === theme) ?? this.themeOptions[0];

    // BMC code
    const enabledTypes = {
      SQL: enabledQueryTypes?.enabledTypes.includes('SQL'),
      FORM: enabledQueryTypes?.enabledTypes.includes('FORM'),
      VQB: enabledQueryTypes?.enabledTypes.includes('VQB'),
      isApplyForAdmin: enabledQueryTypes?.applyForAdmin,
    };
    // end

    return (
      // BMC Code Inline
      <form onSubmit={this.onSubmitFormCustom} className={styles.form}>
        <FieldSet label={<Trans i18nKey="shared-preferences.title">Preferences</Trans>} disabled={disabled}>
          <Field label={t('shared-preferences.fields.theme-label', 'Interface theme')}>
            <Select
              options={this.themeOptions}
              value={currentThemeOption}
              onChange={this.onThemeChanged}
              inputId="shared-preferences-theme-select"
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

          {/* BMC code - start */}
          {this.props.resourceUri === 'org' && this.state.defaultDataSource ? (
            <Field
              label={
                <Label htmlFor="default-query">
                  <span className={styles.labelText}>
                    <Trans i18nKey="bmc.shared-preferences.fields.query-type-label">Query Type</Trans>
                  </span>
                </Label>
              }
              data-testid="Default Query Type Drop Down"
            >
              <Select
                value={this.state.defaultDataSource.queryTypeOptions?.find((query: any) => query.value === queryType)}
                onChange={(query: SelectableValue<string>) => this.onQueryChanged(query.value ?? '')}
                options={this.state.defaultDataSource.queryTypeOptions}
                placeholder={t('bmc.shared-preferences.fields.query-type-placeholder', 'Choose query type')}
                inputId="default-query"
              />
            </Field>
          ) : null}

          <CustomDateFormatPicker
            value={this.state.timeFormat}
            onChange={(value: string) => this.onTimeFormatChanged(value)}
            resourceUri={this.props.resourceUri}
          />

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
            />
          )}

          {this.props.resourceUri === 'org' ? (
            <>
              <Label>
                <span className={styles.labelText}>
                  <Trans i18nKey="bmc.shared-preferences.fields.enabled-query-types">
                    Manage service management query types
                  </Trans>
                </span>
              </Label>
              <InlineFieldRow>
                <InlineField>
                  <InlineSwitch
                    className={styles.switchWidth}
                    value={enabledTypes.FORM}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      this.onEnabledQueryTypesChanged(e.target.checked, 'form')
                    }
                    label="Form"
                    showLabel={true}
                  />
                </InlineField>
                <InlineField>
                  <InlineSwitch
                    className={styles.switchWidth}
                    value={enabledTypes.SQL}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      this.onEnabledQueryTypesChanged(e.target.checked, 'sql')
                    }
                    label="SQL"
                    showLabel={true}
                  />
                </InlineField>
                <InlineField>
                  <InlineSwitch
                    className={styles.switchWidth}
                    value={enabledTypes.VQB}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      this.onEnabledQueryTypesChanged(e.target.checked, 'vqb')
                    }
                    label="Visual query builder"
                    showLabel={true}
                  />
                </InlineField>
              </InlineFieldRow>
              <Field>
                <Checkbox
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    this.onEnabledQueryTypesChanged(e.target.checked, 'admin')
                  }
                  value={enabledTypes.isApplyForAdmin}
                  label={t('bmc.shared-preferences.fields.apply-admins', 'Apply to admins')}
                />
              </Field>
            </>
          ) : null}
          {/* BMC code - end */}
        </FieldSet>

        <Button type="submit" variant="primary" data-testid={selectors.components.UserProfile.preferencesSaveButton}>
          <Trans i18nKey="common.save">Save</Trans>
        </Button>
      </form>
    );
  }
}

export default SharedPreferences;

const getStyles = stylesFactory(() => {
  return {
    labelText: css({
      marginRight: '6px',
    }),
    form: css({
      width: '100%',
      maxWidth: '600px',
    }),
    switchWidth: css({
      minWidth: '120px',
      justifyContent: 'space-between',
    }),
  };
});

function getTranslatedThemeName(theme: ThemeRegistryItem) {
  switch (theme.id) {
    case 'dark':
      return t('shared.preferences.theme.dark-label', 'Dark');
    case 'light':
      return t('shared.preferences.theme.light-label', 'Light');
    case 'system':
      return t('shared.preferences.theme.system-label', 'System preference');
    default:
      return theme.name;
  }
}
