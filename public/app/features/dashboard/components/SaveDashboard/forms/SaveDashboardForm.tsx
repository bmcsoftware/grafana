import { css } from '@emotion/css';
import React, { useMemo, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';
import { Dashboard } from '@grafana/schema';
import { Button, Checkbox, Form, TextArea, useStyles2, Stack } from '@grafana/ui';
import { Trans, t } from 'app/core/internationalization';
import { DashboardModel } from 'app/features/dashboard/state';

import { GenAIDashboardChangesButton } from '../../GenAI/GenAIDashboardChangesButton';
import { SaveDashboardData, SaveDashboardOptions } from '../types';

interface FormDTO {
  message: string;
}

export type SaveProps = {
  dashboard: DashboardModel; // original
  isLoading: boolean;
  saveModel: SaveDashboardData; // already cloned
  onCancel: () => void;
  onSuccess: () => void;
  onSubmit?: (saveModel: Dashboard, options: SaveDashboardOptions, dashboard: DashboardModel) => Promise<any>;
  options: SaveDashboardOptions;
  onOptionsChange: (opts: SaveDashboardOptions) => void;
};

export const SaveDashboardForm = ({
  dashboard,
  isLoading,
  saveModel,
  options,
  onSubmit,
  onCancel,
  onSuccess,
  onOptionsChange,
}: SaveProps) => {
  const hasTimeChanged = useMemo(() => dashboard.hasTimeChanged(), [dashboard]);
  const hasVariableChanged = useMemo(() => dashboard.hasVariablesChanged(), [dashboard]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(options.message);
  const styles = useStyles2(getStyles);

  return (
    <Form
      onSubmit={async (data: FormDTO) => {
        if (!onSubmit) {
          return;
        }
        setSaving(true);
        options = { ...options, message };
        const result = await onSubmit(saveModel.clone, options, dashboard);
        if (result.status === 'success') {
          onSuccess();
        } else {
          setSaving(false);
        }
      }}
    >
      {({ register, errors }) => {
        return (
          <Stack gap={2} direction="column" alignItems="flex-start">
            {hasTimeChanged && (
              <Checkbox
                checked={!!options.saveTimerange}
                onChange={() =>
                  onOptionsChange({
                    ...options,
                    saveTimerange: !options.saveTimerange,
                  })
                }
                label={t(
                  'bmcgrafana.dashboards.save-dashboard.curr-time-as-default',
                  'Save current time range as dashboard default'
                )}
                aria-label={selectors.pages.SaveDashboardModal.saveTimerange}
              />
            )}
            {hasVariableChanged && (
              <Checkbox
                checked={!!options.saveVariables}
                onChange={() =>
                  onOptionsChange({
                    ...options,
                    saveVariables: !options.saveVariables,
                  })
                }
                label={t(
                  'bmcgrafana.dashboards.save-dashboard.curr-var-as-default',
                  'Save current variable values as dashboard default'
                )}
                aria-label={selectors.pages.SaveDashboardModal.saveVariables}
              />
            )}
            <div className={styles.message}>
              {config.featureToggles.dashgpt && (
                <GenAIDashboardChangesButton
                  dashboard={dashboard}
                  onGenerate={(text) => {
                    onOptionsChange({
                      ...options,
                      message: text,
                    });
                    setMessage(text);
                  }}
                  disabled={!saveModel.hasChanges}
                />
              )}
              <TextArea
                aria-label="message"
                value={message}
                onChange={(e) => {
                  onOptionsChange({
                    ...options,
                    message: e.currentTarget.value,
                  });
                  setMessage(e.currentTarget.value);
                }}
                placeholder={t(
                  'bmcgrafana.dashboards.save-dashboard.description-placeholder-text',
                  'Add a note to describe your changes.'
                )}
                autoFocus
                rows={5}
              />
            </div>

            <Stack alignItems="center">
              <Button variant="secondary" onClick={onCancel} fill="outline">
                <Trans i18nKey={'bmc.common.cancel'}>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                disabled={!saveModel.hasChanges || isLoading}
                icon={saving ? 'spinner' : undefined}
                aria-label={selectors.pages.SaveDashboardModal.save}
              >
                {isLoading
                  ? t('bmcgrafana.dashboards.save-dashboard.saving-text', 'Saving...')
                  : t('common.save', 'Save')}
              </Button>
              {!saveModel.hasChanges && (
                <div>
                  <Trans i18nKey={'bmcgrafana.dashboards.save-dashboard.no-changes'}>No changes to save</Trans>
                </div>
              )}
            </Stack>
          </Stack>
        );
      }}
    </Form>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    message: css`
      display: flex;
      align-items: end;
      flex-direction: column;
      width: 100%;
    `,
  };
}
