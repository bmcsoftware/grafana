import { css } from '@emotion/css';
import React, { FC } from 'react';

import { GrafanaTheme } from '@grafana/data';
import { stylesFactory, useTheme } from '@grafana/ui';

import { CalcFieldItem } from '../../types';

interface Props {
  item: CalcFieldItem;
}

export const ViewCalcField: FC<Props> = ({ item }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const extraInfo = [
    { label: 'Name', value: item.name },
    { label: 'Module', value: item.module },
    { label: 'Form Name', value: item.formName },
    { label: 'SQL Query', value: item.sqlQuery },
    { label: 'Aggregated', value: String(item.Aggregation) },
  ];

  return (
    <div className={styles.content}>
      {extraInfo.map(
        (item) =>
          item.value && (
            <div className={styles.item} key={`${item.label} advanced info`}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.description}>{item.value}</span>
            </div>
          )
      )}
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => ({
  content: css`
    display: flex-wrap;
    align-items: right;
  `,
  item: css`
    margin-bottom: 20px;
    &:last-child {
      margin-bottom: 0;
    }
  `,
  label: css`
    label: Label;
    font-size: ${theme.typography.size.sm};
    font-weight: ${theme.typography.weight.semibold};
    line-height: 1.25;
    color: ${theme.colors.formLabel};
    max-width: 480px;
  `,
  description: css`
    label: Label-description;
    color: ${theme.colors.formDescription};
    font-size: ${theme.typography.size.sm};
    font-weight: ${theme.typography.weight.regular};
    display: block;
  `,
}));
