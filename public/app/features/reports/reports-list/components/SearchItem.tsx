import { GrafanaTheme2 } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { Icon, Modal, styleMixins, stylesFactory, Tooltip, useTheme2 } from '@grafana/ui';
import { css, cx } from 'emotion';
import React, { CSSProperties, FC, useCallback, useState } from 'react';
import { SEARCH_ITEM_HEIGHT, SEARCH_ITEM_MARGIN } from '../constants';
import { OnToggleChecked, ReportSectionItem } from '../types';
import { SearchCheckbox } from './SearchCheckbox';
import cronstrue from 'cronstrue';
import { ReportExtraInfo } from './ReportExtraInfo';
import { convertTimeStampToDate } from '../utils';
import { config } from '@grafana/runtime';

export interface Props {
  item: ReportSectionItem;
  editable: boolean;
  onToggleChecked?: OnToggleChecked;
  style?: CSSProperties;
}

const selectors = e2eSelectors.pages.Reports;

export const SearchItem: FC<Props> = ({ item, editable, onToggleChecked, style }) => {
  const [isOpen, setModalStatus] = useState(false);
  const theme = useTheme2();
  const styles = getResultsItemStyles(theme, editable);

  const toggleItem = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (onToggleChecked) {
        onToggleChecked(item);
      }
    },
    [item]
  );
  const timezone = config.bootData.user.timezone;
  const renderItem = () => {
    return (
      <>
        <div style={{ width: '30%' }}>
          <div className={styles.body}>
            <Tooltip content={item.title} theme="info-alt">
              <span
                className={styles.label}
                style={{
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                {item.title}
              </span>
            </Tooltip>
            <span
              className={styles.description}
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {item.description}
            </span>
          </div>
        </div>
        <div className={cx(styles.description, item.enabled ? styles.enableStatus : styles.disableStatus)}>
          {`${item.enabled ? 'Active' : 'Inactive'}`}
        </div>
        <div style={{ fontWeight: 400, fontSize: 'smaller', width: '38%', padding: '0 12px' }}>
          <Tooltip content={`${cronstrue.toString(item.cronExp)}`} theme="info-alt">
            <span
              className={styles.label}
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                width: '100%',
                display: 'block',
              }}
            >
              {`${cronstrue.toString(item.cronExp)}`}
            </span>
          </Tooltip>
        </div>
        <div style={{ width: '16%' }}>
          <div className={styles.body}>
            <span className={styles.label} style={{ fontSize: '12px', fontWeight: 500 }}>
              Last Sent:
            </span>
            <span className={styles.description}>
              {+item.info.lastAt !== 0
                ? convertTimeStampToDate(item.info.lastAt, 'MMMM DD YYYY, HH:mm', timezone)
                : 'N/A'}
            </span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      style={style}
      aria-label={selectors.reports(item.title)}
      className={cx(styles.wrapper, { [styles.selected]: item.selected })}
    >
      <SearchCheckbox editable={editable} checked={item.checked} onClick={toggleItem} />
      {editable ? (
        <div
          style={{
            width: '95%',
            height: '100%',
            display: 'inherit',
          }}
        >
          <a
            onClick={() => {
              let queryParams = location.search
                .slice(1)
                .split('&')
                .map((e) => e.includes('var') && e)
                .filter(Boolean)
                .join('&');
              if (queryParams !== '') {
                sessionStorage.setItem('reportFilter', queryParams);
              }
              location.href = item.url;
            }}
            className={styles.link}
          >
            {renderItem()}
          </a>
        </div>
      ) : (
        renderItem()
      )}
      <Icon
        name="info-circle"
        size="lg"
        className={getInfoIconStyle(item.info.status, theme)}
        onClick={(_) => setModalStatus(true)}
      />
      <Modal
        className={styles.modal}
        title={`Report advanced info`}
        isOpen={isOpen}
        onDismiss={() => setModalStatus(false)}
      >
        <ReportExtraInfo item={item} />
      </Modal>
    </div>
  );
};

const getInfoIconStyle = (status: number, theme: GrafanaTheme2) => {
  switch (status) {
    // warning
    case 2: {
      return css`
        color: ${theme.colors.warning.name};
      `;
    }
    // error
    case 3: {
      return css`
        color: ${theme.colors.error.name};
      `;
    }
    // ok
    default: {
      return '';
    }
  }
};

const getResultsItemStyles = stylesFactory((theme: GrafanaTheme2, editable: boolean) => ({
  wrapper: css`
    ${styleMixins.listItem(theme)};
    height: ${SEARCH_ITEM_HEIGHT}px;
    width: auto;
    margin-bottom: ${SEARCH_ITEM_MARGIN}px;
    padding: 0 ${theme.spacing(2)};
    &:last-child {
      margin-bottom: ${SEARCH_ITEM_MARGIN * 2}px;
    }
    ${editable ? `hover {cursor: pointer;}` : ''}
    box-shadow: none;
    display: -webkit-box;
    box-sizing: content-box;
    -webkit-align-items: center;
    -webkit-box-align: center;
  `,
  selected: css`
    ${styleMixins.listItemSelected(theme)};
  `,
  body: css`
    align-items: start;
    justify-content: center;
    display: flex;
    flex-flow: column;
    overflow: hidden;
    justify-content: space-between;
  `,
  label: css`
    margin-right: 10px;
  `,
  description: css`
    color: ${theme.colors.text.maxContrast};
    font-size: ${theme.typography.size.xs};
    line-height: ${theme.typography.bodySmall.lineHeight};
    max-width: fit-content;
    position: relative;
  `,
  link: css`
    display: flex;
    flex-wrap: nowrap;
    flex-direction: row;
    align-content: center;
    justify-content: flex-start;
    align-items: center;
    width: inherit;
  `,
  enableStatus: css`
    color: ${theme.colors.success.name};
    min-width: 8%;
    height: 22px;
    padding: 0px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    margin: 0px 8px;
    border: 1px solid #0064005c;
    background: #0064001c;
  `,
  disableStatus: css`
    color: ${theme.colors.error.name};
    min-width: 8%;
    height: 22px;
    padding: 0px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    margin: 0px 8px;
    border: 1px solid #6400005c;
    background: #6400005c;
  `,
  modal: css`
    width: 500px;
  `,
}));
