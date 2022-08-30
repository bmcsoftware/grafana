import React, { PureComponent } from 'react';
import { css } from '@emotion/css';
import { contextSrv } from 'app/core/core';

import {
  Button,
  Field,
  FieldSet,
  Form,
  Icon,
  Label,
  RadioButtonGroup,
  Select,
  stylesFactory,
  TimeZonePicker,
  Tooltip,
  WeekStartPicker,
} from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { DashboardSearchHit, DashboardSearchItemType } from 'app/features/search/types';
import { backendSrv } from 'app/core/services/backend_srv';
import { PreferencesService } from 'app/core/services/PreferencesService';

import { customConfigSrv, FEATURE_FLAG_CONFIGURABLE_LINK } from 'app/features/org/state/configuration';
import { OrgCustomConfiguration } from 'app/features/org/OrgCustomConfiguration';
import { getFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';
import { t, Trans } from '@lingui/macro';

export interface Props {
  resourceUri: string;
  disabled?: boolean;
}

export interface State {
  homeDashboardId: number;
  theme: string;
  timezone: string;
  weekStart: string;
  dashboards: DashboardSearchHit[];
  docLink: string;
  supportLink: string;
  communityLink: string;
  videoLink: string;
}

const themes: SelectableValue[] = [
  { value: '', label: t({ id: 'shared-preferences.theme.default-label', message: 'Default' }) },
  { value: 'dark', label: t({ id: 'shared-preferences.theme.dark-label', message: 'Dark' }) },
  { value: 'light', label: t({ id: 'shared-preferences.theme.light-label', message: 'Light' }) },
];

export class SharedPreferences extends PureComponent<Props, State> {
  service: PreferencesService;

  constructor(props: Props) {
    super(props);

    this.service = new PreferencesService(props.resourceUri);
    this.state = {
      homeDashboardId: 0,
      theme: '',
      timezone: '',
      weekStart: '',
      dashboards: [],
      docLink: '',
      supportLink: '',
      communityLink: '',
      videoLink: '',
    };
  }

  async componentDidMount() {
    const prefs = await this.service.load();
    const dashboards = await backendSrv.search({ starred: true });
    const defaultDashboardHit: DashboardSearchHit = {
      id: 0,
      title: 'Default',
      tags: [],
      type: '' as DashboardSearchItemType,
      uid: '',
      uri: '',
      url: '',
      folderId: 0,
      folderTitle: '',
      folderUid: '',
      folderUrl: '',
      isStarred: false,
      slug: '',
      items: [],
    };

    if (prefs.homeDashboardId > 0 && !dashboards.find((d) => d.id === prefs.homeDashboardId)) {
      const missing = await backendSrv.search({ dashboardIds: [prefs.homeDashboardId] });
      if (missing && missing.length > 0) {
        dashboards.push(missing[0]);
      }
    }

    let config = await customConfigSrv.getCustomConfiguration();

    this.setState({
      homeDashboardId: prefs.homeDashboardId,
      theme: prefs.theme,
      timezone: prefs.timezone,
      weekStart: prefs.weekStart,
      dashboards: [defaultDashboardHit, ...dashboards],
      communityLink: config.communityLink,
      docLink: config.docLink,
      supportLink: config.supportLink,
      videoLink: config.videoLink,
    });
  }

  onSubmitForm = async () => {
    const { homeDashboardId, theme, timezone, weekStart } = this.state;
    await this.service.update({ homeDashboardId, theme, timezone, weekStart });
    window.location.reload();
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

  onHomeDashboardChanged = (dashboardId: number) => {
    this.setState({ homeDashboardId: dashboardId });
  };

  getFullDashName = (dashboard: SelectableValue<DashboardSearchHit>) => {
    if (typeof dashboard.folderTitle === 'undefined' || dashboard.folderTitle === '') {
      return dashboard.title;
    }
    return dashboard.folderTitle + ' / ' + dashboard.title;
  };

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
    await Promise.all([this.onSubmitForm(), this.onSubmitConfiguration()]);
    window.location.reload();
  };

  render() {
    const { theme, timezone, weekStart, homeDashboardId, dashboards } = this.state;
    const { disabled } = this.props;
    const styles = getStyles();

    const homeDashboardTooltip = (
      <Tooltip
        content={
          <Trans id="shared-preferences.fields.home-dashboard-tooltip">
            Not finding the dashboard you want? Star it first, then it should appear in this select box.
          </Trans>
        }
      >
        <Icon name="info-circle" />
      </Tooltip>
    );

    return (
      <Form onSubmit={this.onSubmitFormCustom}>
        {(form) => {
          return (
            <FieldSet label={<Trans id="shared-preferences.title">Preferences</Trans>} disabled={disabled}>
              <Field label={t({ id: 'shared-preferences.fields.theme-label', message: 'UI Theme' })}>
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
                      <Trans id="shared-preferences.fields.home-dashboard-label">Home Dashboard</Trans>
                    </span>

                    {homeDashboardTooltip}
                  </Label>
                }
                data-testid="User preferences home dashboard drop down"
              >
                <Select
                  menuShouldPortal
                  value={dashboards.find((dashboard) => dashboard.id === homeDashboardId)}
                  getOptionValue={(i) => i.id}
                  getOptionLabel={this.getFullDashName}
                  onChange={(dashboard: SelectableValue<DashboardSearchHit>) =>
                    this.onHomeDashboardChanged(dashboard.id)
                  }
                  options={dashboards}
                  placeholder={t({
                    id: 'shared-preferences.fields.home-dashboard-placeholder',
                    message: 'Choose default dashboard',
                  })}
                  inputId="home-dashboard-select"
                />
              </Field>

              <Field
                label={t({ id: 'shared-dashboard.fields.timezone-label', message: 'Timezone' })}
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
                label={t({ id: 'shared-preferences.fields.week-start-label', message: 'Week start' })}
                data-testid={selectors.components.WeekStartPicker.containerV2}
              >
                <WeekStartPicker
                  value={weekStart}
                  onChange={this.onWeekStartChanged}
                  inputId={'shared-preferences-week-start-picker'}
                />
              </Field>

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
                  <Button variant="primary" data-testid={selectors.components.UserProfile.preferencesSaveButton}>
                    <Trans id="common.save">Save</Trans>
                  </Button>
                </div>
              )}
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
