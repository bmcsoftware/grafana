import React, { FC } from 'react';
import { CallToActionCard, Icon } from '@grafana/ui';

export const NoReportJobsSplash: FC = () => {
  return (
    <CallToActionCard
      message="Schedule or run a report to see historical data."
      callToActionElement={
        <span key="proTipFooter">
          <Icon name="rocket" />
          <> ProTip: you can see more information related to report schedules. </>
          <a href="https://docs.bmc.com/docs/display/bhd223" target="_blank" className="text-link" rel="noreferrer">
            Learn more
          </a>
        </span>
      }
    />
  );
};
