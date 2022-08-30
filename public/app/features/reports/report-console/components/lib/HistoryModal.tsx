import React from 'react';
import { Alert, Modal, Spinner } from '@grafana/ui';
import { reportsSrv } from 'app/core/services/reports_srv';
import { config } from '@grafana/runtime';
import moment from 'moment-timezone';

interface Props {
  title?: string;
  reportId?: number;
  isOpen?: boolean;
  onDismiss: () => void;
}

export const formatDate = (value: any, { format = 'MMMM DD YYYY, HH:mm', timezone }: any): any => {
  if (value === 0 || !moment(value).isValid()) {
    return undefined;
  }
  const date = moment.unix(new Date(value).getTime() / 1000);
  if (timezone && timezone !== 'browser') {
    return date.tz(timezone).format(format);
  }
  return date.format(format);
};

export const HistoryModal: React.FC<Props> = ({ onDismiss, title, isOpen, reportId }) => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<any>(undefined);
  const [histories, setHistories] = React.useState<JobQueue[] | any>(undefined);

  const initModal = () => {
    setHistories(undefined);
    setError(undefined);
    setLoading(true);
  };

  const setData = (data: any) => {
    setError(undefined);
    setLoading(false);
    setHistories(data);
  };

  const setErrorMsg = (message: string) => {
    setHistories(undefined);
    setLoading(false);
    setError(message);
  };

  const prepareHistory = async () => {
    await reportsSrv
      .getReportsJobsQueue(reportId)
      .then((result) => {
        setData(result);
      })
      .catch((_) => {
        setErrorMsg('Failed to fetch history');
      });
  };

  React.useEffect(() => {
    initModal();
    if (!!reportId) {
      prepareHistory();
    }
  }, [reportId]);

  const { timezone } = config.bootData.user;

  const contentData = () => {
    return (
      <table className="filter-table form-inline">
        <thead>
          <tr>
            <td>Started at</td>
            <td>Status</td>
            <td>Info</td>
            <td>Elapsed time</td>
          </tr>
        </thead>
        <tbody>
          {histories?.map((h: JobQueue, i: number) => {
            const lastStatus = h.status.reverse()?.[0] ?? ({ description: 'N/A' } as any);
            const description = lastStatus.description.split('.').reverse()[0];
            const state = {
              isOK: h.status.some((e) => e.description.includes('Successfully broadcasted report')),
              isNotOK: h.status.some((e) => e.value !== 1),
            };
            const stateMsg =
              state.isOK && state.isNotOK
                ? 'Unstable'
                : state.isOK
                ? 'Success'
                : state.isNotOK
                ? 'Failed'
                : !state.isOK && !state.isNotOK
                ? 'Pending'
                : 'N/A';
            return (
              <tr key={'history_list_' + i}>
                <td className="width-2">{formatDate(h.queue.startedAt, timezone)}</td>
                <td className="width-2">{stateMsg} </td>
                <td className="width-3">{description}</td>
                <td className="width-2">{h.queue.elapsedTime}s </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const content = () => {
    if (loading) {
      return <Spinner />;
    }
    if (!!error) {
      return <Alert severity="error" title={error} />;
    }
    if (!!histories && histories.length === 0) {
      return <Alert severity="info" title="No history found" />;
    }

    return contentData();
  };

  return (
    <Modal
      title={(title ?? 'N/A') + ' - History'}
      isOpen={isOpen}
      onDismiss={onDismiss}
      closeOnEscape={true}
      closeOnBackdropClick={true}
    >
      {content()}
    </Modal>
  );
};

interface JobQueue {
  queue: {
    jobId: number;
    elapsedTime: number;
    startedAt: string;
    finishedAt: string;
  };
  status: Array<{
    value: number;
    description: string;
    createdAt: string;
  }>;
}
