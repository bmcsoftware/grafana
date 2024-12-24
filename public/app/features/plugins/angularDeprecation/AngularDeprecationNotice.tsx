import React from 'react';

import { reportInteraction } from '@grafana/runtime';
import { Alert } from '@grafana/ui';
import { LocalStorageValueProvider } from 'app/core/components/LocalStorageValueProvider';

const LOCAL_STORAGE_KEY_PREFIX = 'grafana.angularDeprecation.dashboardNotice.isDismissed';

function localStorageKey(dashboardUid: string): string {
  return LOCAL_STORAGE_KEY_PREFIX + '.' + dashboardUid;
}

export interface Props {
  dashboardUid: string;
}

export function AngularDeprecationNotice({ dashboardUid }: Props) {
  return (
    <LocalStorageValueProvider<boolean> storageKey={localStorageKey(dashboardUid)} defaultValue={false}>
      {(isDismissed, onDismiss) => {
        if (isDismissed) {
          return null;
        }
        return (
          <div id="angular-deprecation-notice">
            <Alert
              severity="warning"
              // BMC Change: Next line inline
              title="This dashboard uses deprecated plug-ins that will be discontinued in an upcoming release. You must replace them with supported plug-ins to avoid any impact to this dashboard."
              onRemove={() => {
                reportInteraction('angular_deprecation_notice_dismissed');
                onDismiss(true);
              }}
            >
              <div className="markdown-html">
                {/* BMC Change Starts */}
                For more information, see the Deprecated and discontinued features topic in product documentation.
                {/* <ul>
                  <li>
                    <a
                      href="https://grafana.com/docs/grafana/latest/developers/angular_deprecation/"
                      className="external-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read our deprecation notice and migration advice.
                    </a>
                  </li>
                </ul> */}
                {/* BMC Change Ends */}
              </div>
            </Alert>
          </div>
        );
      }}
    </LocalStorageValueProvider>
  );
}
