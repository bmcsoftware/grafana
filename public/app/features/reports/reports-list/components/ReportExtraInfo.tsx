import { GrafanaTheme } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { stylesFactory, useTheme } from '@grafana/ui';
import { config } from 'app/core/config';
import { css } from '@emotion/css';
import React, { FC } from 'react';
import { ReportSectionItem } from '../types';
import { convertTimeStampToDate } from '../utils';

export interface Props {
  item: ReportSectionItem;
}

const selectors = e2eSelectors.pages.Reports;

export const ReportExtraInfo: FC<Props> = ({ item }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const timezone = config.bootData.user.timezone;

  const extraInfo = [
    { lable: 'Created at', value: convertTimeStampToDate(item.info.createdAt, 'MMMM DD YYYY, HH:mm', timezone) },
    { lable: 'Updated at', value: convertTimeStampToDate(item.info.updatedAt, 'MMMM DD YYYY, HH:mm', timezone) },
    { lable: 'Last execution at', value: convertTimeStampToDate(item.info.lastAt, 'MMMM DD YYYY, HH:mm', timezone) },
    { lable: 'Next execution at', value: convertTimeStampToDate(item.info.nextAt, 'MMMM DD YYYY, HH:mm', timezone) },
  ];

  return (
    <div aria-label={selectors.reports(item.title + ' extra info')} className={styles.content}>
      {extraInfo.map(
        (item) =>
          item.value && (
            <div className={styles.item} key={`${item.lable} advanced info`}>
              <span className={styles.label}>{item.lable}</span>
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
