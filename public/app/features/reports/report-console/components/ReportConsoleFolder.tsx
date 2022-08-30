import { css, cx } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { CollapsableSection, Icon, useStyles2 } from '@grafana/ui';
import { useUniqueId } from 'app/plugins/datasource/influxdb/components/useUniqueId';
import React, { useState } from 'react';
import { getSectionIcon } from '../../reports-list/utils';

interface Props {
  title: string;
  url?: string;
  isExpanded?: boolean;
  children: React.ReactNode;
}

export const ReportConsoleFolder: React.FC<Props> = ({ title, url, children, isExpanded = false }) => {
  const styles = useStyles2((theme: GrafanaTheme2) => getStyles(theme, false, true));

  const [expanded, setExpanded] = useState(isExpanded);

  const id = useUniqueId();
  const labelId = `section-header-label-${id}`;

  return (
    <div className={styles.section}>
      <CollapsableSection
        isOpen={expanded}
        onToggle={setExpanded}
        className={styles.wrapper}
        contentClassName={styles.content}
        loading={false}
        labelId={title}
        label={
          <>
            <div className={styles.icon}>
              <Icon name={getSectionIcon({ expanded } as any)} />
            </div>

            <div className={styles.text}>
              <span id={labelId}>{title}</span>
              {url && (
                <a href={url} className={styles.link}>
                  <span className={styles.separator}>|</span> <Icon name="folder-upload" /> Go to folder
                </a>
              )}
            </div>
          </>
        }
      >
        {children}
      </CollapsableSection>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2, selected = false, editable: boolean) => {
  const { sm } = theme.v1.spacing;

  return {
    section: css`
      display: flex;
      flex-direction: column;
      background: ${theme.v1.colors.panelBg};
      border-bottom: solid 1px ${theme.v1.colors.border2};
    `,
    wrapper: cx(
      css`
        align-items: center;
        font-size: ${theme.typography.size.base};
        padding: 12px;
        border-bottom: none;
        color: ${theme.v1.colors.textWeak};
        z-index: 1;
        &:hover,
        &.selected {
          color: ${theme.colors.text};
        }
        &:hover,
        &:focus-visible,
        &:focus-within {
          a {
            opacity: 1;
          }
        }
      `,
      'pointer',
      { selected }
    ),
    checkbox: css`
      padding: 0 ${sm} 0 0;
    `,
    icon: css`
      padding: 0 ${sm} 0 ${editable ? 0 : sm};
    `,
    text: css`
      flex-grow: 1;
      line-height: 24px;
    `,
    link: css`
      padding: 2px 10px 0;
      color: ${theme.v1.colors.textWeak};
      opacity: 0;
      transition: opacity 150ms ease-in-out;
    `,
    separator: css`
      margin-right: 6px;
    `,
    content: css`
      padding-top: 0px;
      padding-bottom: 0px;
    `,
  };
};
