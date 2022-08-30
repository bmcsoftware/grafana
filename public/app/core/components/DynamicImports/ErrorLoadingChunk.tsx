import React, { FunctionComponent } from 'react';
import { stylesFactory } from '@grafana/ui';
import { css } from '@emotion/css';

const getStyles = stylesFactory(() => {
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
});

const style = getStyles();

interface Props {
  error: Error | null;
}

export const ErrorLoadingChunk: FunctionComponent<Props> = ({ error }) => (
  <div className={style.container}>
    <div>
      <img src="public/img/bmc_page_failure_icon.svg"></img>
    </div>
    <div>
      <h3 className={style.mainText}>Oops... some unexpected error has occurred.</h3>
    </div>
    <div>
      <p className={style.subText}>
        Take a snapshot of the error details given below, and send it to&nbsp;
        <a className={style.links} href="https://www.bmc.com/support" target="_blank" rel="noreferrer">
          BMC Support
        </a>
        .
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
);

ErrorLoadingChunk.displayName = 'ErrorLoadingChunk';
