import { css, cx } from '@emotion/css';
import React, { FC } from 'react';

import { GrafanaTheme } from '@grafana/data';
import { Icon, stylesFactory, useTheme } from '@grafana/ui';

import { CalcFieldModule } from '../../types';
import { getSectionIcon } from '../../utils';

interface SectionHeaderProps {
  editable?: boolean;
  onSectionClick: (section: CalcFieldModule) => void;
  section: CalcFieldModule;
}

export const SectionHeader: FC<SectionHeaderProps> = ({ section, onSectionClick, editable = false }) => {
  const theme = useTheme();
  const styles = getSectionHeaderStyles(theme, false, editable);

  const onSectionExpand = () => {
    onSectionClick(section);
  };

  return (
    <div
      className={styles.wrapper}
      onClick={onSectionExpand}
      aria-label={section.expanded ? `Collapse folder ${section.id}` : `Expand folder ${section.id}`}
    >
      <div className={styles.icon}>
        <Icon name={getSectionIcon(section)} />
      </div>

      <div className={styles.text}>{section.title}</div>
    </div>
  );
};

const getSectionHeaderStyles = stylesFactory((theme: GrafanaTheme, selected = false, editable: boolean) => {
  const { sm } = theme.spacing;
  return {
    wrapper: cx(
      css`
        display: flex;
        align-items: center;
        font-size: ${theme.typography.size.base};
        padding: 12px;
        color: ${theme.colors.textWeak};

        &:hover,
        &.selected {
          color: ${theme.colors.text};
        }

        &:hover {
          a {
            opacity: 1;
          }
        }
      `,
      'pointer',
      { selected }
    ),
    icon: css`
      padding: 0 ${sm} 0 ${editable ? 0 : sm};
    `,
    text: css`
      flex-grow: 1;
      line-height: 24px;
    `,
    link: css`
      padding: 2px 10px 0;
      color: ${theme.colors.textWeak};
      opacity: 0;
      transition: opacity 150ms ease-in-out;
    `,
    separator: css`
      margin-right: 6px;
    `,
  };
});
