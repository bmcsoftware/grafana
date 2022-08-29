import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Card, HorizontalGroup, LinkButton, Tooltip, useStyles2, useTheme2 } from '@grafana/ui';
import { Job } from './ReportConsoleList';
import { toInteger, upperFirst } from 'lodash';
import { config } from '@grafana/runtime';
import { formatDate } from './lib/HistoryModal';
interface Props {
  data: Job;
  runReport?: () => void;
  deleteReport?: () => void;
  enableReport?: () => void;
  disableReport?: () => void;
  showRecipients?: () => void;
  showLastSchedules?: (id: number, title: string) => void;
  inFolder: boolean;
}
export const ReportConsoleItem: React.FC<Props> = ({
  data,
  inFolder,
  deleteReport,
  enableReport,
  disableReport,
  showRecipients,
  runReport,
  showLastSchedules,
}) => {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const [expanded, setExpanded] = React.useState<boolean>(false);
  const colors = {
    fail: theme.colors.error.main,
    success: theme.colors.success.main,
    none: theme.colors.warning.main,
  };

  const { timezone, id } = config.bootData.user;

  const extraInfo = [
    { label: 'Created at', value: formatDate(data.createdAt, { timezone }) },
    { label: 'Updated at', value: formatDate(data.updatedAt, { timezone }) },
    { label: 'Last run at', value: formatDate(+(data.lastAt ?? 0) * 1000, { timezone }) },
    { label: 'Next run at', value: formatDate(+data.nextAt * 1000, { timezone }) },
  ];

  const isOwner = id === data.userId;

  return (
    <div style={{ ...(inFolder ? { margin: '0 24px 0 32px' } : {}), marginBottom: '6px' }}>
      <Card
        style={{ minHeight: 54, padding: '8px', marginBottom: 0 }}
        className={styles.container}
        onClick={() => {
          setExpanded(!expanded);
        }}
      >
        <Card.Heading>
          <span style={{ paddingLeft: '4px' }}>{data.reportName}</span>
        </Card.Heading>
        <Card.Tags>
          <span style={{ paddingRight: '4px', display: 'flex', fontWeight: 500, fontSize: '12px' }}>
            <span className={styles.item}>{data.reportType.toUpperCase()}</span>
            <span>|</span>
            <span className={styles.item} style={{ width: '110px' }}>
              Last run
              <span style={{ color: colors[data.state] }}> {upperFirst(data.state)} </span>
            </span>
            <span>|</span>
            <span className={styles.item} style={{ width: '155px' }}>
              {data.lastAt === '0' || toInteger(data.lastAt) === 0 || !data.lastAt ? 'N / A' : extraInfo[3].value}
            </span>
          </span>
        </Card.Tags>
      </Card>
      {expanded && (
        <div className={styles.moreInfoWrapper}>
          <Card>
            <Card.Actions className={styles.moreInfoContainer}>
              <HorizontalGroup align="flex-start" justify="space-between">
                <div>
                  <div className={styles.flex}>
                    <b className={styles.itemInfo}>Report ID: </b> <span>{data.id}</span>
                  </div>
                  <div className={styles.flex}>
                    <b className={styles.itemInfo}>Dashboard: </b>
                    <span>{data.dashName}</span>
                  </div>
                  <div className={styles.flex}>
                    <b className={styles.itemInfo}>Recipients: </b>
                    <a onClick={showRecipients}>
                      <u>View recipients</u>
                    </a>
                  </div>
                  <div className={styles.flex}>
                    <b className={styles.itemInfo}>Created by: </b> <span>{data.createdBy}</span>
                  </div>
                  <div
                    style={{
                      margin: '16px 0',
                    }}
                  >
                    <Tooltip
                      content={isOwner ? 'Edit report' : 'You do not have permissions to edit this report'}
                      placement="top"
                    >
                      <LinkButton
                        variant="secondary"
                        icon="edit"
                        size="xs"
                        target="_blank"
                        href={isOwner ? 'reports/edit/' + data.id : undefined}
                        style={{ marginRight: '8px', height: '26px', fontSize: '12px' }}
                      >
                        Edit
                      </LinkButton>
                    </Tooltip>
                    <Tooltip
                      content={isOwner ? 'Delete report' : 'You do not have permissions to delete this report'}
                      placement="top"
                    >
                      <Button
                        onClick={isOwner ? deleteReport : undefined}
                        variant="secondary"
                        icon="trash-alt"
                        size="xs"
                        style={{ height: '26px', fontSize: '12px' }}
                      >
                        Delete
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: '40px',
                  }}
                >
                  {extraInfo.map((info, i) => {
                    return (
                      <div className={styles.flex} key={'more_info_' + i}>
                        <b className={styles.itemInfo}> {info.label} </b>
                        <span>{info.value}</span>
                      </div>
                    );
                  })}
                </div>
              </HorizontalGroup>
              <HorizontalGroup align="flex-end" justify="space-between">
                <div>
                  <div className={styles.flex}>
                    <span className={styles.itemInfo}>
                      <b> Total runs:&nbsp;</b>
                      <span>{data.totalRuns}</span>
                    </span>
                    <b> Total failures:&nbsp;</b>
                    <span>{data.totalFail}</span>
                  </div>
                  <div className={styles.flex}>
                    <b className={styles.itemInfo}>Last failure reason: </b>
                    <span>{data.lastFail?.split('.')?.reverse()?.[0] ?? 'N/A'}</span>
                  </div>
                </div>
                <div className={styles.actionButtons}>
                  <LinkButton
                    className={styles.button}
                    size="xs"
                    icon="apps"
                    variant="primary"
                    target="_blank"
                    href={'d/' + data.dashUid}
                  >
                    Go to dashboard
                  </LinkButton>
                  <Tooltip
                    content={isOwner ? 'Run report now' : 'You do not have permissions to run this report'}
                    placement="top"
                  >
                    <Button className={styles.button} onClick={isOwner ? runReport : undefined} size="xs">
                      Re-run now
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content={
                      isOwner
                        ? `${data.enabled ? 'Disable' : 'Enable'} report`
                        : `You do not have permissions to ${data.enabled ? 'disable' : 'enable'} this report`
                    }
                    placement="top"
                  >
                    <Button
                      className={styles.button}
                      onClick={!isOwner ? undefined : data.enabled ? disableReport : enableReport}
                      size="xs"
                    >
                      <span>{data.enabled ? 'Disable' : 'Enable'}</span>
                    </Button>
                  </Tooltip>
                  <Button
                    className={styles.button}
                    onClick={() => showLastSchedules?.(data.id, data.reportName)}
                    size="xs"
                    icon="history"
                  >
                    Show last 10 schedules
                  </Button>
                </div>
              </HorizontalGroup>
            </Card.Actions>
          </Card>
        </div>
      )}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      margin-bottom: ${theme.spacing(0.75)};
      padding: ${theme.spacing(1)} ${theme.spacing(2)};
    `,
    metaContainer: css`
      display: flex;
      align-items: center;
      margin-right: ${theme.spacing(1)};
      svg {
        margin-right: ${theme.spacing(0.5)};
      }
    `,
    checkbox: css`
      margin-right: 0;
    `,
    item: css`
      padding-left: 4px;
      padding-right: 4px;
    `,
    moreInfoWrapper: css`
      border-top: 1px solid ${theme.colors.border.medium};
    `,
    moreInfoContainer: css`
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    `,
    moreInfoContainer2: css`
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    `,
    flex: css`
      font-size: 12px;
      display: flex;
    `,
    itemInfo: css`
      width: 130px;
    `,
    button: css`
      margin: 4px;
      height: 26px;
      font-size: 12px;
    `,
    actionButtons: css`
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      flex-direction: row;
      align-items: flex-end;
    `,
  };
};
