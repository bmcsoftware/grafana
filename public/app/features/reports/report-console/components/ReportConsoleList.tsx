import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { ConfirmModal, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { groupBy, isEmpty, map, orderBy, filter } from 'lodash';
import { ReportConsoleItem } from './ReportConsoleItem';
import { ReportConsoleFolder } from './ReportConsoleFolder';
import { useQueryParams } from 'app/core/hooks/useQueryParams';
import { getFiltersFromUrlParams } from '../misc';
import { reportsSrv } from 'app/core/services/reports_srv';
import { HistoryModal } from './lib/HistoryModal';
import { RecipientsListModal } from './lib/RecipientsListModal';
import { useUniqueId } from 'app/plugins/datasource/influxdb/components/useUniqueId';

export interface Job {
  id: number;
  reportName: string;
  reportType: string;
  dashName: string;
  dashUid: string;
  createdAt: string;
  updatedAt: string;
  nextAt: string;
  lastAt?: string;
  createdBy: string;
  userId: number;
  totalRuns: number;
  totalFail: number;
  lastFail?: string;
  enabled?: boolean;
  state: 'fail' | 'success' | 'none';
}

interface Props {
  jobs: Job[];
  folderUid?: string;
  update: () => void;
}

export const ReportConsoleList: React.FC<Props> = (props) => {
  const s = useStyles2(getStyles);
  const [queryParams, _] = useQueryParams();
  const { view = 'folder', sort, state, types, query } = getFiltersFromUrlParams(queryParams);

  const isFolder = !!props.folderUid;
  const { folderUid } = props;

  const [jobs, setJobs] = React.useState<Job[]>(props.jobs);
  const uidJobs = (jobs: Job[]) => filter(jobs, (job) => job.dashUid === props.folderUid || !folderUid);
  const stateJobs = (jobs: Job[]) => filter(jobs, (job) => job.state === state || !state);
  const typeJobs = (jobs: Job[]) =>
    filter(jobs, (job) => types?.includes(job.reportType) || !types || types?.length === 0);
  const queryJobs = (jobs: Job[]) =>
    filter(jobs, (job) => job.reportName.toLocaleLowerCase()?.includes(query?.toLocaleLowerCase() ?? ''));
  const orderedJobs = (jobs: Job[]) =>
    orderBy(jobs, view === 'folder' ? ['dashName'] : ['reportName'], sort === 'alpha-desc' ? 'desc' : 'asc');

  useEffect(() => {
    setJobs(uidJobs(stateJobs(typeJobs(queryJobs(orderedJobs(props.jobs))))));
  }, [folderUid, state, query, view, types, sort, props.jobs]);

  const onRun = (id: number) => {
    setAlertPayload({
      title: 'Run this report?',
      description: 'This will send email to all recipients configured in the scheduled report.',
      onConfirm: () => reportsSrv.executeReports([id]),
      confirmText: 'Run',
    });
  };

  const onDelete = (id: number) => {
    setAlertPayload({
      title: 'Delete',
      description: 'Do you want to delete the selected report?',
      onConfirm: () => {
        reportsSrv.deleteReports([id]).then(() => {
          // should change to use dispatch here...
          props.update();
        });
      },
      confirmText: 'Delete',
    });
  };

  const onEnable = (id: number) => {
    setAlertPayload({
      title: 'Enable',
      description: 'Do you want to enable the selected report?',
      onConfirm: () => {
        reportsSrv.enableReports([id]).then(() => {
          props.update();
        });
      },
      confirmText: 'Enable',
    });
  };

  const onDisable = (id: number) => {
    setAlertPayload({
      title: 'Disable',
      description: 'Do you want to disable the selected report?',
      onConfirm: () => {
        reportsSrv.disableReports([id]).then(() => {
          props.update();
        });
      },
      confirmText: 'Disable',
    });
  };

  const onShowLastSchedules = (reportId: number, title: string) => {
    setHistoryPayload({
      reportId,
      title,
    });
  };

  const onShowRecipients = (reportId: number) => {
    setReportIdPayload({
      reportId,
    });
  };

  const [alertPayload, setAlertPayload] = useState<any>(undefined);
  const [historyPayload, setHistoryPayload] = useState<any>(undefined);
  const [reportIdPayload, setReportIdPayload] = useState<any>(undefined);

  return (
    <div className={s.container}>
      <div className={s.wrapper}>
        {view === 'list' || isFolder ? (
          <ReportConsoleListItem
            jobs={jobs}
            query={query}
            onDelete={onDelete}
            onRun={onRun}
            onEnable={onEnable}
            onDisable={onDisable}
            onShowLastSchedules={onShowLastSchedules}
            onShowRecipients={onShowRecipients}
          />
        ) : (
          <ReportConsoleListFolder
            key={'key_'+query}
            jobs={jobs}
            query={query}
            onDelete={onDelete}
            onRun={onRun}
            onEnable={onEnable}
            onDisable={onDisable}
            onShowLastSchedules={onShowLastSchedules}
            onShowRecipients={onShowRecipients}
          />
        )}
      </div>
      <ConfirmModal
        title={alertPayload?.title}
        body={undefined}
        isOpen={!!alertPayload}
        description={alertPayload?.description}
        confirmText={alertPayload?.confirmText}
        onDismiss={() => setAlertPayload(undefined)}
        onConfirm={async () => {
          await alertPayload?.onConfirm();
          setAlertPayload(undefined);
        }}
      />
      <HistoryModal
        title={historyPayload?.title}
        reportId={historyPayload?.reportId}
        onDismiss={() => setHistoryPayload(undefined)}
        isOpen={!!historyPayload}
      />
      <RecipientsListModal
        title={reportIdPayload?.title}
        reportId={reportIdPayload?.reportId}
        onDismiss={() => setReportIdPayload(undefined)}
        isOpen={!!reportIdPayload}
      />
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    border: 1px solid ${theme.colors.border.medium};
    border-radius: 2px;
    padding: 4px 0px 4px 4px;
    position: relative;
    min-height: calc(100vh - 382px);
  `,
  wrapper: css`
    max-height: calc(100vh - 392px);
    margin-bottom: 10px;
    overflow: auto;
  `,
  spinner: css`
    height: 30vh;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  label: css`
    padding: ${theme.spacing(1)};
    background-color: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.borderRadius()};
  `,
});

interface FolderLayout {
  title: string;
  uid?: string;
  jobs: Job[];
}

interface ReportConsoleFolderItemListProps {
  jobs: Job[];
  query?: string;
  inFolder?: boolean;
  onDelete: (id: number) => void;
  onRun: (id: number) => void;
  onEnable: (id: number) => void;
  onDisable: (id: number) => void;
  onShowRecipients: (id: number) => void;
  onShowLastSchedules: (id: number, title: string) => void;
}

const ReportConsoleListFolder: React.FC<ReportConsoleFolderItemListProps> = ({
  jobs,
  query,
  onDelete,
  onRun,
  onEnable,
  onDisable,
  onShowRecipients,
  onShowLastSchedules,
}) => {
  const collapsedReports = groupBy(jobs, (report) => report.dashName);
  const folders: FolderLayout[] = map(collapsedReports, (jobs, title) => {
    // get dashboard.uid if it reports is not empty
    const uid = isEmpty(jobs) ? undefined : jobs[0].dashUid;
    return { title, uid, jobs };
  });
  const uniqueId = useUniqueId();
  const folderKey = `folder_${uniqueId}`;

  return (
    <div>
      {folders?.map((folder, index) => {
        return (
          <div key={'folder_' + index}>
            <ReportConsoleFolder
              key={`${folderKey}_${index}`}
              isExpanded={!!query && query !== ''}
              title={folder.title}
              url={'reports/history/f/' + folder.uid}
            >
              <ReportConsoleListItem
                jobs={folder.jobs}
                query={query}
                onDelete={onDelete}
                onRun={onRun}
                onEnable={onEnable}
                onDisable={onDisable}
                onShowLastSchedules={onShowLastSchedules}
                onShowRecipients={onShowRecipients}
                inFolder={true}
              />
            </ReportConsoleFolder>
          </div>
        );
      })}
    </div>
  );
};

const ReportConsoleListItem: React.FC<ReportConsoleFolderItemListProps> = ({
  jobs,
  inFolder = false,
  onDelete,
  onRun,
  onEnable,
  onDisable,
  onShowRecipients,
  onShowLastSchedules,
}) => {
  return (
    <div>
      {jobs?.map((job, index) => {
        return (
          <ReportConsoleItem
            key={'folder_' + index}
            data={job}
            inFolder={inFolder}
            deleteReport={() => onDelete(job.id)}
            runReport={() => onRun(job.id)}
            enableReport={() => onEnable(job.id)}
            disableReport={() => onDisable(job.id)}
            showLastSchedules={onShowLastSchedules}
            showRecipients={() => onShowRecipients(job.id)}
          />
        );
      })}
    </div>
  );
};
