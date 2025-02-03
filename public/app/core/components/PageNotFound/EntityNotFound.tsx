// import { css } from '@emotion/css';
// import { GrafanaTheme2 } from '@grafana/data';
// import { selectors } from '@grafana/e2e-selectors';
// import { EmptyState, TextLink, useStyles2 } from '@grafana/ui';
import { getConfig } from 'app/core/config';
import { Trans } from 'app/core/internationalization';

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
            <h3 className="bmc_error_main_text">
              <Trans i18nKey="bmcgrafana.page-not-found.load-error">Oops... we could not load that page.</Trans>
            </h3>
          </div>
          <div className="bmc_error_sub_text">
            <Trans i18nKey="bmcgrafana.page-not-found.load-error-subtext">
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
            </Trans>
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
//       padding: theme.spacing(8, 2, 2, 2),
//     }),
//   };
// }
