/*
 * Copyright (C) 2022 BMC Software Inc
 * Added by ymulthan at 4/12/2022
 */

import { css } from '@emotion/css';
import { forOwn as _forOwn } from 'lodash';
import React, { FC, useState } from 'react';

import { GrafanaTheme } from '@grafana/data';
import { Field, FieldSet, Icon, stylesFactory, Switch, useTheme } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import {
  updateFeatureStatus,
  loadGrafanaFeatures,
  getGrafanaFeaturesList,
} from 'app/features/dashboard/services/featureFlagSrv';

const toggleFeatureStatus = async (featureName: string, status: boolean) => {
  await updateFeatureStatus({ featureName, status });
  await loadGrafanaFeatures();
  return;
};

const ToggleFeature: FC<any> = () => {
  const [loadingFeatures, setLoadingFeatures] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const styles = getStyles(theme);
  const featuresMap = getGrafanaFeaturesList();
  const featuresList: any = [];

  _forOwn(featuresMap, (val, key) => {
    featuresList.push(
      <Field label={key} horizontal key={key} className={styles.item}>
        {loadingFeatures.has(key) ? (
          <Icon name="fa fa-spinner" size="sm" />
        ) : (
          <Switch
            value={val}
            onChange={() => {
              loadingFeatures.add(key);
              setLoadingFeatures(new Set(loadingFeatures));
              toggleFeatureStatus(key, !val)
                .then(() => {
                  location.reload();
                })
                .finally(() => {
                  loadingFeatures.delete(key);
                  setLoadingFeatures(new Set(loadingFeatures));
                });
            }}
          />
        )}
      </Field>
    );
  });
  return (
    <div className={styles.container}>
      {
        <FieldSet label={t('bmc.toggle-feature.manage-features', 'Manage dashboard features')} disabled={false}>
          {featuresList}
        </FieldSet>
      }
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    container: css`
      max-width: 600px;
      width: 100%;
    `,
    spinner: css`
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100px;
    `,
    item: css`
      border: 1px solid ${theme.colors.border1};
      border-radius: 2px;
      padding: 5px;
    `,
  };
});

export default ToggleFeature;
