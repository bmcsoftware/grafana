import React, { FC } from 'react';

import { HorizontalGroup, LinkButton } from '@grafana/ui';

export interface Props {
  canEdit?: boolean;
}

export const ListActions: FC<Props> = ({ canEdit }) => {
  const actionUrl = (type: string) => {
    return `calculated-fields/${type}`;
  };

  return (
    <HorizontalGroup spacing="md" align="center">
      {canEdit && (
        <LinkButton href={actionUrl('new')} onClick={() => {}}>
          New Calculated Field
        </LinkButton>
      )}
    </HorizontalGroup>
  );
};
