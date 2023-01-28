/*
 * @Author amulay
 * @Author kavraham
 * @Author bfakhera
 * @Author kmejdi
 *
 * Created on Jun 3, 2020
 * Copyright (c) 2021 - BMC Software Inc
 */

import React from 'react';

import { SelectableValue } from '@grafana/data';
import { Button, Icon, RadioButtonGroup, Select, Spinner } from '@grafana/ui';
import { config } from 'app/core/config';
import { useAppNotification } from 'app/core/copy/appNotification';
import { DashboardModel, PanelModel } from 'app/features/dashboard/state';
import { PDFLayout, PDFOrientation, ReportType } from 'app/features/reports/manage-report/types';

import { buildHostUrl } from './utils';

interface Props {
  dashboard: DashboardModel;
  panel?: PanelModel;
  onDismiss?(): void;
}

const layoutOptions: Array<SelectableValue<PDFLayout>> = [
  { label: 'Grid', value: PDFLayout.GRID },
  { label: 'Simple', value: PDFLayout.SIMPLE },
];
const orientationOptions: Array<SelectableValue<PDFOrientation>> = [
  { label: 'Portrait', value: PDFOrientation.PORTRAIT },
  { label: 'Landscape', value: PDFOrientation.LANDSCAPE },
];
const defaultReportTypeOptions: Array<SelectableValue<ReportType>> = [
  { label: 'PDF', value: ReportType.PDF, fileType: 'application/pdf', fileExt: 'pdf' },
  {
    label: 'XLSX',
    value: ReportType.XLS,
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileExt: 'xlsx',
  },
  { label: 'CSV', value: ReportType.CSV, fileType: 'application/zip', fileExt: 'zip' },
];

interface PreviewDoc {
  uid: string;
  name: string;
  filter: string;
  layout: string;
  reportType: string;
  orientation: string;
  timeRange: string;
  timeRangeTo: string;
  timezone: string;
  theme: string;
}

export interface State {
  selectedLayout: SelectableValue<PDFLayout>;
  selectedOrientation: SelectableValue<PDFOrientation>;
  selectedReportType: SelectableValue<ReportType>;

  isProcessing: boolean;
  isDownload: boolean;
  isPreview: boolean;
}

const ExportUtility: React.FC<Props> = (props) => {
  const notifyApp = useAppNotification();
  const reportTypeOptions = getDashReportTypes(props.dashboard, props.panel);

  const [state, setState] = React.useState<State>({
    selectedLayout: layoutOptions[0],
    selectedOrientation: orientationOptions[0],
    selectedReportType: reportTypeOptions[0],
    isProcessing: false,
    isDownload: false,
    isPreview: false,
  });

  const getVariables = (): string => {
    return location.search
      .slice(1, location.search.length)
      .split('&')
      .filter((e) => e.includes('var'))
      .join('&');
  };

  const exportToDoc = async (openInNewTab: boolean) => {
    setState({ ...state, isProcessing: true, isPreview: openInNewTab, isDownload: !openInNewTab });

    let variables = getVariables();

    if (props.panel) {
      variables += `&viewPanel=${props.panel?.id}&type=${props.panel.type}`;
    }

    const layout = state.selectedLayout.value;
    const orientation = state.selectedOrientation.value;
    const reportType = state.selectedReportType?.value?.toLowerCase();
    // Get browser timezone with Intl
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = props.dashboard.getTimezone() === 'browser' ? browserTz : props.dashboard.getTimezone();

    const payload: PreviewDoc = {
      name: props.panel?.title ?? props.dashboard.title,
      uid: props.dashboard.uid,
      reportType: reportType ?? ReportType.PDF,
      layout: layout ?? PDFLayout.GRID,
      orientation: orientation ?? PDFOrientation.PORTRAIT,
      theme: config.theme.type,
      timezone: timezone,
      timeRange: props.dashboard.time.from,
      timeRangeTo: props.dashboard.time.to,
      filter: variables,
    };

    await exportDocument(payload, openInNewTab, () => {
      setState({ ...state, isProcessing: false, isDownload: false, isPreview: false });
    });
  };

  const errorMsg = (msg?: string): string => {
    let variable: any = props.dashboard.getVariables().find((t) => t.id === 'pdf_per_record');
    if (variable !== undefined && variable?.query !== '') {
      return `Please reduce selected variable values for '${variable.query}' and try again later`;
    }
    if (msg !== undefined && msg !== '') {
      return msg;
    }
    return 'Failed to generate report, try again later';
  };

  const exportDocument = async (payload: any, openInNewTab: boolean, callback: () => void): Promise<void> => {
    try {
      const res = await fetch(`${buildHostUrl()}/api/reports/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let jdata = await res.json().catch(() => {});
        notifyApp.error(errorMsg(jdata?.message));
        callback();
        return;
      }

      const reportType = state.selectedReportType!;

      let fileName = `${payload.name} Preview`;
      let fileExt = (reportType as any).fileExt;
      let fileType = (reportType as any).fileType;

      const result = await res.blob();
      const buffer = await result.arrayBuffer();
      const blob = new Blob([buffer], {
        type: fileType,
      });
      const link = document.createElement('a');
      const href = window.URL.createObjectURL(blob);

      notifyApp.success('Successfully generated report');

      link.setAttribute('href', href);
      link.setAttribute('target', openInNewTab ? '_blank' : '_self');
      if (!openInNewTab) {
        link.setAttribute('download', `${fileName}.${fileExt}`);
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      notifyApp.error(errorMsg());
    } finally {
      callback();
    }
  };

  const onReportTypeChange = (value: SelectableValue<ReportType>) => {
    setState({ ...state, selectedReportType: value });
  };

  const onOrientationChange = (value: PDFOrientation) => {
    const selected = orientationOptions.find((e) => e.value === value) as SelectableValue<PDFOrientation>;
    setState({ ...state, selectedOrientation: selected });
  };

  const onLayoutChange = (value: PDFLayout) => {
    const selected = layoutOptions.find((e) => e.value === value) as SelectableValue<PDFLayout>;
    setState({ ...state, selectedLayout: selected });
  };

  const { selectedLayout, selectedOrientation, selectedReportType, isProcessing, isDownload, isPreview } = state;
  const target = props.panel ? 'panel' : 'dashboard';
  const type = selectedReportType?.label;
  const title = `Save the ${target} as ${type}`;
  const { onDismiss } = props;

  const isTablePanel =
    props.panel?.type === 'table' || props.panel?.type === 'table-old' || props.panel?.type === 'bmc-ade-cross-tab';
  const shouldShowLayout = (!isTablePanel || !props.panel) && selectedReportType?.value === ReportType.PDF;
  const shouldShowOrientation = selectedReportType?.value === ReportType.PDF;

  return (
    <div className="share-modal-body">
      <div className="share-modal-header">
        <Icon name="save" size="xxl" className="share-modal-big-icon" />
        <div className="share-modal-content">
          <h5 className="share-modal-info-text" style={{ paddingBottom: '24px' }}>
            {title}
          </h5>
          <div className="gf-form">
            <label className="gf-form-label width-8" htmlFor="report-type">Type</label>
            <Select
              id="report-type"
              width={32}
              options={reportTypeOptions}
              defaultValue={reportTypeOptions[0]}
              value={state.selectedReportType}
              placeholder={'Select a report type'}
              onChange={onReportTypeChange}
            />
          </div>
          {shouldShowLayout && (
            <div className="gf-form">
              <label className="gf-form-label width-8" htmlFor="layout">Layout</label>
              <div className="width-16">
                <RadioButtonGroup
                  id="layout"
                  options={layoutOptions}
                  value={selectedLayout.value}
                  onChange={onLayoutChange}
                  fullWidth
                />
              </div>
            </div>
          )}
          {shouldShowOrientation && (
            <div className="gf-form">
              <label className="gf-form-label width-8" htmlFor="orientation">Orientation</label>
              <div className="width-16">
                <RadioButtonGroup
                  id="orientation"
                  options={orientationOptions}
                  value={selectedOrientation.value}
                  onChange={onOrientationChange}
                  fullWidth
                />
              </div>
            </div>
          )}
          <div className="gf-form-button-row">
            <Button
              variant="primary"
              disabled={isProcessing || !selectedReportType}
              onClick={() => exportToDoc(false)}
              id="getDocument"
            >
              Download {type}
              {isProcessing && isDownload && <Spinner inline={true} style={{ paddingLeft: '8px' }}></Spinner>}
            </Button>
            {selectedReportType?.value === ReportType.PDF && (
              <Button
                variant="secondary"
                disabled={isProcessing || !selectedReportType}
                onClick={() => exportToDoc(true)}
                id="viewDocument"
              >
                View {type}
                {isProcessing && isPreview && <Spinner inline={true} style={{ paddingLeft: '8px' }}></Spinner>}
              </Button>
            )}
            <Button variant="secondary" onClick={onDismiss} id="cancel">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getDashReportTypes = (dashboard: any, panel: any): any => {
  let ALL_REPORT_TYPES = [ReportType.PDF, ReportType.XLS, ReportType.CSV];
  let ALL_OPTIONS = defaultReportTypeOptions;

  if (panel) {
    const canCSV = panel.type === 'table' || panel.type === 'table-old';
    if (canCSV) {
      return ALL_OPTIONS;
    }
    return ALL_OPTIONS.filter((e) => e.value !== ReportType.CSV);
  }

  const canCSV = dashboard.panels.some((panel: any) => panel.type === 'table' || panel.type === 'table-old');
  if (!canCSV) {
    ALL_OPTIONS = ALL_OPTIONS.filter((e) => e.value !== ReportType.CSV);
  }

  const rule = dashboard.getVariables().find((v: any) => v.name === 'supported_report_types');
  if (!rule) {
    return ALL_OPTIONS;
  }

  const options = rule.options
    .map((o: any) => o.value.toLowerCase())
    .filter((o: any) => ALL_REPORT_TYPES.includes(o.toLowerCase()));

  if (options.length === 0) {
    return ALL_OPTIONS;
  }

  return ALL_OPTIONS.filter((e) => options.includes(e.value));
};

export default ExportUtility;
