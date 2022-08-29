import { GrafanaTheme } from '@grafana/data';
import { Button, Checkbox, HorizontalGroup, Input, Modal, Spinner, stylesFactory, useTheme } from '@grafana/ui';
import { reportsSrv } from 'app/core/services/reports_srv';
import { css } from '@emotion/css';
import React, { FC, useState } from 'react';

interface Props {
  show: boolean;
  recipients: any[];
  onSubmit: (value: any, callback: () => void) => void;
  onClose: () => void;
}

export const ReportMailingDialog: FC<Props> = ({ show, recipients, onSubmit, onClose }) => {
  const styles = getStyles(useTheme());
  const [state, setState] = useState({
    loading: false,
    error: '',
    useCustomEmail: '',
    useRecipients: false,
    domains: {
      whitelist: [],
      internalOnly: false,
    },
  });

  const onTestMailSubmit = (value: any) => {
    setState({ ...state, loading: true, error: '' });
    onSubmit(value, () => {
      setState({ ...state, loading: false, error: '' });
    });
  };

  const prepareEmailDomainLimit = () => {
    reportsSrv.getReportSettings().then((value) => {
      setState({
        ...state,
        useRecipients: value.internalDomainsOnly,
        domains: {
          whitelist: value.whitelistedDomains,
          internalOnly: value.internalDomainsOnly,
        },
      });
    });
  };

  const validateEmailWithDomainLimit = (recipient: any) => {
    const { whitelist, internalOnly } = state.domains;
    if (whitelist.length > 0 && !internalOnly) {
      const isValid = whitelist.some((domain) => recipient.includes(domain));
      if (!isValid) {
        console.log(`${recipient} 's domain is not allowed.`);
        setState({ ...state, error: `${recipient}'s domain is not allowed.` });
        return false;
      }
    }
    return true;
  };

  React.useEffect(() => {
    prepareEmailDomainLimit();
  }, []);

  return (
    <>
      <Modal className={styles.modal} title={'Send test email'} icon={'share-alt'} isOpen={show} onDismiss={onClose}>
        <div>
          <div className={styles.wrapper}>
            <Input
              label={'Email'}
              type={'email'}
              placeholder={'your.address@company.com'}
              value={state.useCustomEmail}
              onChange={(event) => {
                setState({ ...state, useCustomEmail: event.currentTarget.value });
              }}
              disabled={state.useRecipients}
            />
          </div>
          <div className={styles.wrapper}>
            <Checkbox
              name="useRecipients"
              height={40}
              label={'Use emails from report'}
              value={state.useRecipients}
              onChange={(event) => {
                setState({ ...state, useRecipients: state.domains.internalOnly || event.currentTarget.checked });
              }}
            />
          </div>
          <div className={styles.error}>{state.error}</div>
          <HorizontalGroup align={'center'} justify={'center'} className={styles.wrapper}>
            <Button
              type="button"
              variant="primary"
              disabled={state.loading}
              onClick={() => {
                if (state.useRecipients) {
                  if (recipients.length === 0) {
                    setState({
                      ...state,
                      useRecipients: false,
                      error: 'Report has no recipients configured.',
                    });
                    return;
                  }
                  onTestMailSubmit(recipients);
                } else if (
                  (state.useRecipients && recipients.length === 0) ||
                  (!state.useRecipients && state.useCustomEmail === '')
                ) {
                  setState({ ...state, error: 'Please insert an email address' });
                } else if (
                  state.useCustomEmail &&
                  state.useCustomEmail !== '' &&
                  new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/).test(state.useCustomEmail)
                ) {
                  if (validateEmailWithDomainLimit(state.useCustomEmail)) {
                    onTestMailSubmit([{ label: '', value: state.useCustomEmail, description: '' }]);
                  }
                } else {
                  setState({ ...state, error: 'Please insert a valid email address' });
                }
              }}
            >
              {!state.loading ? 'Send' : 'Sending'} {state.loading && <Spinner inline={true}></Spinner>}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {!state.loading ? 'Close' : 'Hide'}
            </Button>
          </HorizontalGroup>
        </div>
      </Modal>
    </>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    wrapper: css`
      padding: '4px 0';
    `,
    modal: css`
      width: 500px;
    `,
    error: css`
      padding: 8px 0;
      font-size: 12px;
      text-align: center;
      color: #c62828;
    `,
  };
});
