import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { config } from '@grafana/runtime';
import { ClipboardButton, Field, Label, useTheme2 } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { useCustomReducer } from '../hooks/useCustomReducer';

const connectionDetails = [
  {
    label: 'TENANT_ID',
    displayLabel: 'Tenant Id',
    value: config.bootData.user.orgId,
    comment:
      '#Please carefully review all the property values to ensure compatibility in your environment.\n\n#Enter the tenant id',
    display: true,
  },
  {
    label: 'TENANT_URL',
    displayLabel: 'Tenant URL',
    value: `${window.location.protocol}//${window.location.host}`,
    comment: '#Enter the tenant url',
    display: true,
  },
  {
    label: 'AR_HOST',
    displayLabel: 'AR Host',
    value: '127.0.0.1',
    comment: '#Enter the AR host / Local client gateway host name',
    display: true,
  },
  {
    label: 'AR_RPC_PORT',
    displayLabel: 'AR RPC Port',
    value: '46000',
    comment: '#Enter the AR RPC port / Local client gateway AR API port',
    display: true,
  },
  {
    label: 'REST_ENDPOINT',
    displayLabel: 'Rest Endpoint',
    value: '',
    comment: '#Enter the rest endpoint / platform URL',
    display: true,
  },
  {
    label: 'ENV_ALIAS',
    displayLabel: 'Environment',
    value: `Development`,
    comment: '#Enter the environment',
    display: true,
  },
];

export default function Overview() {
  const theme = useTheme2();
  const styles = getStyles(theme);
  return (
    <>
      <div className={styles.rowWrapper}>
        <p style={{ fontSize: `${theme.spacing(2)}`, margin: 0 }}>
          {t(
            'bmc.rms.description',
            'Reporting Metadata Studio is a Windows application based on Pentaho Metadata Editor. It is used to create customized views or modify a copy of an out-of-the-box view. For more information, see the online documentation.'
          )}
        </p>
      </div>
      <div className={styles.rowWrapper}>
        <RenderVideoRow />
      </div>
      <RenderConnectionDetails />
    </>
  );
}

const RenderVideoRow = () => {
  const theme = useTheme2();
  const styles = getStyles(theme);
  return (
    <div className={styles.width50} style={{ height: '350px' }}>
      <iframe
        src={`https://www.youtube.com/embed/-R6U_2NRh28?hl=${config.bootData.user.language ?? 'en'}`}
        title="Reporting Metadata Studio | BMC Helix Dashboards"
        style={{ width: '100%', height: '100%' }}
        frameBorder="0"
        allowFullScreen
        allow="autoplay; encrypted-media"
      />
    </div>
  );
};

const RenderConnectionDetails = () => {
  const theme = useTheme2();
  const styles = getStyles(theme);
  const { state } = useCustomReducer();
  const [connDetails, setConnDetails] = useState(connectionDetails);
  useEffect(() => {
    const newConnDetails = [...connectionDetails];
    newConnDetails.map((item) => {
      if (item.label === 'REST_ENDPOINT') {
        item.value = state.platformURL!;
      }
    });
    setConnDetails(newConnDetails);
  }, [state.platformURL]);
  return (
    <div className={styles.rowWrapper}>
      <div className={styles.justifyContent} style={{ width: '50%' }}>
        <div className={styles.headerText}>{t('bmc.rms.headers.env-details', 'Environment details')}</div>
        <ClipboardButton
          style={{ marginLeft: '15px' }}
          icon="copy"
          variant="secondary"
          getText={() => {
            return connDetails.reduce((acc, nextVal) => {
              return acc + `${nextVal.comment}\n${nextVal.label}=${nextVal.value}\n\n`;
            }, '');
          }}
        >
          {t('share-modal.view-json.copy-button', 'Copy to Clipboard')}
        </ClipboardButton>
      </div>
      <div className={styles.width50} style={{ marginTop: `${theme.spacing(1.5)}` }}>
        {connDetails.map((item) => {
          return item.display ? (
            <Field label={item.displayLabel} horizontal={true} className={styles.marginBottomField}>
              <Label className={styles.labelVal}>{item.value}</Label>
            </Field>
          ) : null;
        })}
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    headerText: css`
      font-size: ${theme.typography.size.lg};
      font-weight: ${theme.typography.fontWeightRegular};
    `,
    labelVal: css`
      font-size: ${theme.typography.size.md};
      font-weight: ${theme.typography.fontWeightMedium};
    `,
    marginBottomField: css`
      margin-bottom: ${theme.spacing(1)};
    `,
    rowWrapper: css`
      display: flex;
      margin-bottom: ${theme.spacing(3)};
      flex-direction: column;
    `,
    justifyContent: css`
      display: flex;
      justify-content: space-between;
    `,
    width50: css`
      width: 50%;
    `,
  };
};
