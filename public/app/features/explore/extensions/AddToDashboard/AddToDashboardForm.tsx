import { partial } from 'lodash';
import React, { type ReactElement, useEffect, useState } from 'react';
import { DeepMap, FieldError, FieldErrors, useForm } from 'react-hook-form';

import { locationUtil, SelectableValue } from '@grafana/data';
import { config, locationService, reportInteraction } from '@grafana/runtime';
import { Alert, Button, Field, InputControl, Modal, RadioButtonGroup } from '@grafana/ui';
import { DashboardPicker } from 'app/core/components/Select/DashboardPicker';
import { t, Trans } from 'app/core/internationalization';
import { contextSrv } from 'app/core/services/context_srv';
import { removeDashboardToFetchFromLocalStorage } from 'app/features/dashboard/state/initDashboard';
import { AccessControlAction, useSelector } from 'app/types';

import { getExploreItemSelector } from '../../state/selectors';

import { setDashboardInLocalStorage, AddToDashboardError } from './addToDashboard';

enum SaveTarget {
  NewDashboard = 'new-dashboard',
  ExistingDashboard = 'existing-dashboard',
}

interface SaveTargetDTO {
  saveTarget: SaveTarget;
}
interface SaveToNewDashboardDTO extends SaveTargetDTO {
  saveTarget: SaveTarget.NewDashboard;
}

interface SaveToExistingDashboard extends SaveTargetDTO {
  saveTarget: SaveTarget.ExistingDashboard;
  dashboardUid: string;
}

type FormDTO = SaveToNewDashboardDTO | SaveToExistingDashboard;

function assertIsSaveToExistingDashboardError(
  errors: FieldErrors<FormDTO>
): asserts errors is DeepMap<SaveToExistingDashboard, FieldError> {
  // the shape of the errors object is always compatible with the type above, but we need to
  // explicitly assert its type so that TS can narrow down FormDTO to SaveToExistingDashboard
  // when we use it in the form.
}

function getDashboardURL(dashboardUid?: string) {
  return dashboardUid ? `d/${dashboardUid}` : 'dashboard/new';
}

enum GenericError {
  UNKNOWN = 'unknown-error',
  NAVIGATION = 'navigation-error',
}

interface SubmissionError {
  error: AddToDashboardError | GenericError;
  message: string;
}

interface Props {
  onClose: () => void;
  exploreId: string;
}

export function AddToDashboardForm(props: Props): ReactElement {
  const { exploreId, onClose } = props;
  const exploreItem = useSelector(getExploreItemSelector(exploreId))!;
  const [submissionError, setSubmissionError] = useState<SubmissionError | undefined>();
  const {
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<FormDTO>({
    defaultValues: { saveTarget: SaveTarget.NewDashboard },
  });

  const canCreateDashboard = contextSrv.hasPermission(AccessControlAction.DashboardsCreate);
  const canWriteDashboard = contextSrv.hasPermission(AccessControlAction.DashboardsWrite);

  const saveTargets: Array<SelectableValue<SaveTarget>> = [];
  if (canCreateDashboard) {
    saveTargets.push({
      // BMC Change: Next line
      label: t('bmcgrafana.explore.to-dashboard.new-dashboard-text', 'New dashboard'),
      value: SaveTarget.NewDashboard,
    });
  }
  if (canWriteDashboard) {
    saveTargets.push({
      // BMC Change: Next line
      label: t('bmcgrafana.explore.to-dashboard.existing-dashboard-text', 'Existing dashboard'),
      value: SaveTarget.ExistingDashboard,
    });
  }

  const saveTarget = saveTargets.length > 1 ? watch('saveTarget') : saveTargets[0].value;

  const onSubmit = async (openInNewTab: boolean, data: FormDTO) => {
    setSubmissionError(undefined);
    const dashboardUid = data.saveTarget === SaveTarget.ExistingDashboard ? data.dashboardUid : undefined;

    reportInteraction('e_2_d_submit', {
      newTab: openInNewTab,
      saveTarget: data.saveTarget,
      queries: exploreItem.queries.length,
    });

    const { from, to } = exploreItem.range.raw;

    try {
      await setDashboardInLocalStorage({
        dashboardUid,
        datasource: exploreItem.datasourceInstance?.getRef(),
        queries: exploreItem.queries,
        queryResponse: exploreItem.queryResponse,
        panelState: exploreItem?.panelsState,
        time: {
          from: typeof from === 'string' ? from : from.toISOString(),
          to: typeof to === 'string' ? to : to.toISOString(),
        },
      });
    } catch (error) {
      switch (error) {
        case AddToDashboardError.FETCH_DASHBOARD:
          setSubmissionError({
            error,
            // BMC Change: Next line
            message: t(
              'bmcgrafana.explore.to-dashboard.errors.unable-fetch-dash-info',
              'Could not fetch dashboard information. Please try again.'
            ),
          });
          break;
        case AddToDashboardError.SET_DASHBOARD_LS:
          setSubmissionError({
            error,
            // BMC Change: Next line
            message: t(
              'bmcgrafana.explore.to-dashboard.errors.panel-to-dashboard-err',
              'Could not add panel to dashboard. Please try again.'
            ),
          });
          break;
        default:
          setSubmissionError({
            error: GenericError.UNKNOWN,
            // BMC Change: Next line
            message: t('bmcgrafana.explore.to-dashboard.errors.general', 'Something went wrong. Please try again.'),
          });
      }
      return;
    }

    const dashboardURL = getDashboardURL(dashboardUid);
    if (!openInNewTab) {
      onClose();
      locationService.push(locationUtil.stripBaseFromUrl(dashboardURL));
      return;
    }

    const didTabOpen = !!global.open(config.appUrl + dashboardURL, '_blank');
    if (!didTabOpen) {
      setSubmissionError({
        error: GenericError.NAVIGATION,
        // BMC Change: Next line
        message: t(
          'bmcgrafana.explore.to-dashboard.errors.navigation-to-dashboard',
          'Could not navigate to the selected dashboard. Please try again.'
        ),
      });
      removeDashboardToFetchFromLocalStorage();
      return;
    }
    onClose();
  };

  useEffect(() => {
    reportInteraction('e_2_d_open');
  }, []);

  return (
    <form>
      {saveTargets.length > 1 && (
        <InputControl
          control={control}
          render={({ field: { ref, ...field } }) => (
            <Field
              // BMC Change: Next line
              label={t('bmcgrafana.explore.to-dashboard.target-dashboard-text', 'Target dashboard')}
              // BMC Change: Next line
              description={t(
                'bmcgrafana.explore.to-dashboard.choose-dashboard-type-text',
                'Choose where to add the panel.'
              )}
            >
              <RadioButtonGroup options={saveTargets} {...field} id="e2d-save-target" />
            </Field>
          )}
          name="saveTarget"
        />
      )}

      {saveTarget === SaveTarget.ExistingDashboard &&
        (() => {
          assertIsSaveToExistingDashboardError(errors);
          return (
            <InputControl
              render={({ field: { ref, value, onChange, ...field } }) => (
                <Field
                  // BMC Change: Next line
                  label={t('bmcgrafana.explore.to-dashboard.dashboard-text', 'Dashboard')}
                  // BMC Change: Next line
                  description={t(
                    'bmcgrafana.explore.to-dashboard.choose-dashboard-text',
                    'Select in which dashboard the panel will be created.'
                  )}
                  error={errors.dashboardUid?.message}
                  invalid={!!errors.dashboardUid}
                >
                  <DashboardPicker
                    {...field}
                    inputId="e2d-dashboard-picker"
                    defaultOptions
                    onChange={(d) => onChange(d?.uid)}
                  />
                </Field>
              )}
              control={control}
              name="dashboardUid"
              shouldUnregister
              rules={{
                required: {
                  value: true,
                  // BMC Change: Next line
                  message: t('bmcgrafana.explore.to-dashboard.errors.field-mandatory', 'This field is required.'),
                },
              }}
            />
          );
        })()}

      {submissionError && (
        <Alert
          severity="error"
          // BMC Change: Next line
          title={t('bmcgrafana.explore.to-dashboard.errors.add-panel-err', 'Error adding the panel')}
        >
          {submissionError.message}
        </Alert>
      )}

      <Modal.ButtonRow>
        <Button type="reset" onClick={onClose} fill="outline" variant="secondary">
          {/* BMC Change: Next line */}
          <Trans i18nKey={'bmc.common.cancel'}>Cancel</Trans>
        </Button>
        <Button
          type="submit"
          variant="secondary"
          onClick={handleSubmit(partial(onSubmit, true))}
          icon="external-link-alt"
        >
          {/* BMC Change: Next line */}
          <Trans i18nKey={'bmcgrafana.explore.to-dashboard.open-new-tab-text'}>Open in new tab</Trans>
        </Button>
        <Button type="submit" variant="primary" onClick={handleSubmit(partial(onSubmit, false))} icon="apps">
          {/* BMC Change: Next line */}
          <Trans i18nKey={'bmcgrafana.explore.to-dashboard.open-dash-text'}>Open dashboard</Trans>
        </Button>
      </Modal.ButtonRow>
    </form>
  );
}
