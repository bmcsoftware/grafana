import React from 'react';
import { Alert, Modal, Spinner } from '@grafana/ui';
import { reportsSrv } from 'app/core/services/reports_srv';

interface Props {
  title?: string;
  reportId?: number;
  isOpen?: boolean;
  onDismiss: () => void;
}

export const RecipientsListModal: React.FC<Props> = ({ onDismiss, title, isOpen, reportId }) => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<any>(undefined);
  const [report, setReport] = React.useState<any>(undefined);

  const initModal = () => {
    setReport(undefined);
    setError(undefined);
    setLoading(true);
  };

  const setData = (data: any) => {
    setError(undefined);
    setLoading(false);
    setReport(data);
  };

  const setErrorMsg = (message: string) => {
    setReport(undefined);
    setLoading(false);
    setError(message);
  };

  const prepareModal = async () => {
    await reportsSrv
      .getReportById(reportId!)
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
      prepareModal();
    }
  }, [reportId]);

  const contentData = () => {
    return (
      <table className="filter-table form-inline">
        <tbody>
          {report?.recipients?.map((recipient: string, i: number) => {
            return (
              <tr key={'recipient_item_' + i}>
                <td className="width-2"> {recipient} </td>
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
    if (!!report && report?.recipients.length === 0) {
      return <Alert severity="info" title="No recipients found" />;
    }

    return contentData();
  };

  return (
    <Modal
      title={title ?? 'Recipients'}
      isOpen={isOpen}
      onDismiss={onDismiss}
      closeOnEscape={true}
      closeOnBackdropClick={true}
    >
      {content()}
    </Modal>
  );
};
