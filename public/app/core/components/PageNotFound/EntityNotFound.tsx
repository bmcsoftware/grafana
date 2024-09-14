// import { css } from '@emotion/css';
import React from 'react';

// import { GrafanaTheme2 } from '@grafana/data';
// import { useStyles2, useTheme2 } from '@grafana/ui';
import { getConfig } from 'app/core/config';

// BMC Import
import { Page } from '../Page/Page';

export interface Props {
  /**
   * Defaults to Page
   */
  entity?: string;
}

export function EntityNotFound({ entity = 'Page' }: Props) {
  // const styles = useStyles2(getStyles);

  // BMC Code: Start
  const homePage = getConfig().appSubUrl + '/';
  return (
    <>
      <Page.Contents>
        <div className="bmc_error_container page-body">
          <div>
            <img src="public/img/bmc_page_not_found_icon.svg" alt="" />
          </div>
          <div>
            <h3 className="bmc_error_main_text">Oops... we could not load that page.</h3>
          </div>
          <div className="bmc_error_sub_text">
            <p>This page might have been removed, had its name changed, or is temporarily unavailable.</p>
            <p>
              Go back to the&nbsp;
              <a className="bmc_error_links" href={homePage}>
                Home Page
              </a>
              , or contact&nbsp;
              <a className="bmc_error_links" href="https://www.bmc.com/support" target="_blank" rel="noreferrer">
                BMC Support
              </a>
              .
            </p>
          </div>
        </div>
      </Page.Contents>
      <Page.Contents>
        <div className="bmc_error_container page-body">
          <div>
            <img src="public/img/bmc_page_not_found_icon.svg" alt="" />
          </div>
          <div>
            <h3 className="bmc_error_main_text">Oops... we could not load that page.</h3>
          </div>
          <div className="bmc_error_sub_text">
            <p>This page might have been removed, had its name changed, or is temporarily unavailable.</p>
            <p>
              Go back to the&nbsp;
              <a className="bmc_error_links" href={homePage}>
                Home Page
              </a>
              , or contact&nbsp;
              <a className="bmc_error_links" href="https://www.bmc.com/support" target="_blank" rel="noreferrer">
                BMC Support
              </a>
              .
            </p>
          </div>
        </div>
      </Page.Contents>
    </>
  );
  // BMC Code: End
}

// export function getStyles(theme: GrafanaTheme2) {
//   return {
//     container: css({
//       display: 'flex',
//       flexDirection: 'column',
//       padding: theme.spacing(8, 2, 2, 2),
//       h1: {
//         textAlign: 'center',
//       },
//     }),
//     subtitle: css({
//       color: theme.colors.text.secondary,
//       fontSize: theme.typography.h5.fontSize,
//       padding: theme.spacing(2, 0),
//       textAlign: 'center',
//     }),
//     grot: css({
//       maxWidth: '450px',
//       paddingTop: theme.spacing(8),
//       margin: '0 auto',
//     }),
//   };
// }
