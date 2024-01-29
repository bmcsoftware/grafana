import { css } from '@emotion/css';
import React, { ErrorInfo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { locationUtil } from '@grafana/data';
import { stylesFactory } from '@grafana/ui';

import { Trans } from '../internationalization';

interface Props {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export function GrafanaRouteError({ error, errorInfo }: Props) {
  const location = useLocation();
  const isChunkLoadingError = error?.name === 'ChunkLoadError';

  useEffect(() => {
    // Auto reload page 1 time if we have a chunk load error
    if (isChunkLoadingError && location.search.indexOf('chunkNotFound') === -1) {
      window.location.href = locationUtil.getUrlForPartial(location, { chunkNotFound: true });
    }
  }, [location, isChunkLoadingError]);

  // Would be good to know the page navId here but needs a pretty big refactoring

  // To be verified
  return (
    // BMC code
    <div className={style.container}>
      <div>
        <img src="public/img/bmc_page_failure_icon.svg" alt=""></img>
      </div>
      <div>
        <h3 className={style.mainText}>
          <Trans i18nKey="bmc.route-error">Oops... some unexpected error has occurred.</Trans>
        </h3>
      </div>
      <div>
        <p className={style.subText}>
          <Trans i18nKey="bmc.contact-support">
            <span style={{ marginRight: '10px' }}>
              Take a snapshot of the error details given below, and send it to
            </span>
            <a className={style.links} href="https://www.bmc.com/support" target="_blank" rel="noreferrer">
              BMC Support.
            </a>
          </Trans>
        </p>
      </div>
      <div className={style.detailsContainer}>
        <details style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '13px' }}>
          {error && error.message ? error.message : 'Unexpected error occurred'}
          <br />
          {error && error.stack ? error.stack : null}
        </details>
      </div>
    </div>
    // End
  );
}

const getStyles = stylesFactory(() => {
  // BMC code
  // return css`
  //   width: 500px;
  //   margin: 64px auto;
  // `;
  return {
    container: css`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 128px auto;
      width: 40%;
      @media only screen and (max-width: 1440px) {
        width: 50%;
      }
      @media only screen and (max-width: 1200px) {
        width: 60%;
      }
      @media only screen and (max-width: 992px) {
        width: 80%;
      }
    `,
    mainText: css`
      text-align: center;
      margin-top: 40px;
      font-size: 32px;
    `,
    subText: css`
      text-align: center;
      margin-top: 12px;
      font-size: 18px;
    `,
    detailsContainer: css`
      margin-top: 30px;
      width: 100%;
    `,
    links: css`
      color: #33a2e5;
    `,
  };
  // End
});

// BMC code - next line
const style = getStyles();
