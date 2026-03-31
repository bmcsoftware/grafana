import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Trans } from '@grafana/i18n';
// @Copyright 2026 BMC Software, Inc.
// Date - 03/31/2026
// Commented unused import
// import { TextLink } from '@grafana/ui';
// END
import { EmptyState, useStyles2 } from '@grafana/ui';

export interface Props {
  /**
   * Defaults to Page
   */
  entity?: string;
}

export function EntityNotFound({ entity = 'Page' }: Props) {
  const styles = useStyles2(getStyles);
  const lowerCaseEntity = entity.toLowerCase();

  return (
    <div className={styles.container} data-testid={selectors.components.EntityNotFound.container}>
      <EmptyState message={`${entity} not found`} variant="not-found">
        <Trans i18nKey="entity-not-found.description">
          We&apos;re looking but can&apos;t seem to find this {{ lowerCaseEntity }}. Try returning{' '}
        {/* 
          // @Copyright 2026 BMC Software, Inc.
          // Date - 03/31/2026
          // Commented text
          <TextLink href="/">home</TextLink> or seeking help on the{' '}
          <TextLink href="https://community.grafana.com" external>
            community site.
          </TextLink>
          // END
        */}
        </Trans>
      </EmptyState>
    </div>
  );
}

export function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: theme.spacing(8, 2, 2, 2),
    }),
  };
}
