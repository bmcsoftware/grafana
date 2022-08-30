import React, { FC } from 'react';
import { HorizontalGroup, LinkButton } from '@grafana/ui';

export interface Props {
  dashboard: any;
  canEdit?: boolean;
}

export const ReportActions: FC<Props> = ({ dashboard, canEdit }) => {
  const actionUrl = (type: string) => {
    return `reports${dashboard ? '/d/' + dashboard.uid : ''}/${type}`;
  };

  return (
    <HorizontalGroup spacing="md" align="center">
      {canEdit && (
        <LinkButton
          // href={actionUrl('new')}
          onClick={() => {
            let queryParams = location.search
              .slice(1)
              .split('&')
              .map((e) => e.includes('var') && e)
              .filter(Boolean)
              .join('&');
            sessionStorage.setItem('reportFilter', queryParams);
            location.href = actionUrl('new');
          }}
        >
          New Scheduled Report
        </LinkButton>
      )}
    </HorizontalGroup>
  );
};
