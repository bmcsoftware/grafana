/*
 * @Author amulay
 * @Author kavraham
 * @Author bfakhera
 * @Author kmejdi
 *
 * Created on Jun 3, 2020
 * Copyright (c) 2021 - BMC Software Inc
 */

import React, { PureComponent } from 'react';
import { Button, Icon, RadioButtonGroup, Select, Spinner } from '@grafana/ui';
import { DashboardModel, PanelModel } from 'app/features/dashboard/state';
import { PDFLayout, PDFOrientation, ReportType } from 'app/features/reports/manage-report/types';
import { buildHostUrl } from './utils';
import { config } from 'app/core/config';
import moment from 'moment-timezone';
import { AppEvents } from '@grafana/data';
import { appEvents } from 'app/core/core';

interface Props {
  dashboard: DashboardModel;
  panel?: PanelModel;
  onDismiss?(): void;
}

interface DocumentOption {
  label: string;
  value: PDFLayout | PDFOrientation | ReportType | any;
}

const layoutOptions: DocumentOption[] = [
  { label: 'Grid', value: PDFLayout.GRID },
  { label: 'Simple', value: PDFLayout.SIMPLE },
];
const orientationOptions: DocumentOption[] = [
  { label: 'Portrait', value: PDFOrientation.PORTRAIT },
  { label: 'Landscape', value: PDFOrientation.LANDSCAPE },
];
const reportTypeOptions: DocumentOption[] = [
  { label: 'PDF', value: ReportType.PDF },
  { label: 'XLS', value: ReportType.XLS },
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
  selectedLayout: DocumentOption;
  selectedOrientation: DocumentOption;
  selectedReportType?: DocumentOption;

  isProcessing: boolean;
  isDownload: boolean;
  isPreview: boolean;

  reportTypeOptions: any[];
}

export default class ExportUtility extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const availableOptions = this.getAvailableOptions();
    this.state = {
      selectedLayout: layoutOptions[0],
      selectedOrientation: orientationOptions[0],
      selectedReportType: availableOptions[0],
      isProcessing: false,
      isDownload: false,
      isPreview: false,
      reportTypeOptions: availableOptions,
    };
  }

  getVariables = (): string => {
    return location.search
      .slice(1, location.search.length)
      .split('&')
      .filter((e) => e.includes('var'))
      .join('&');
  };

  exportToDoc = async (openInNewTab: boolean) => {
    this.setState({ ...this.state, isProcessing: true, isPreview: openInNewTab, isDownload: !openInNewTab });

    let variables = this.getVariables();

    if (this.props.panel) {
      variables += `&viewPanel=${this.props.panel?.id}`;
    }

    const layout = this.props?.panel ? PDFLayout.SIMPLE : this.state.selectedLayout.value;
    const orientation = this.props?.panel ? PDFOrientation.LANDSCAPE : this.state.selectedOrientation.value;
    const timezone =
      this.props.dashboard.timezone === 'browser' ? moment.tz.guess(true) : this.props.dashboard.timezone;
    const payload: PreviewDoc = {
      name: this.props.dashboard.title,
      uid: this.props.dashboard.uid,
      reportType: this.state.selectedReportType?.value,
      layout: layout,
      orientation: orientation,
      theme: config.theme.type,
      timezone: timezone,
      timeRange: this.props.dashboard.time.from,
      timeRangeTo: this.props.dashboard.time.to,
      filter: variables,
    };

    await this.exportDocument(payload, openInNewTab, () => {
      this.setState({ isProcessing: false, isDownload: false, isPreview: false });
    });
  };

  errorMsg(msg?: string): string {
    let variable: any = this.props.dashboard.getVariables().find((t) => t.id === 'pdf_per_record');
    if (variable !== undefined && variable?.query !== '') {
      return `Please reduce selected variable values for '${variable.query}' and try again later`;
    }
    if (msg !== undefined && msg !== '') {
      return msg;
    }
    return 'Failed to generate report, try again later';
  }

  exportDocument = async (payload: any, openInNewTab: boolean, callback: () => void): Promise<void> => {
    try {
      const res = await fetch(`${buildHostUrl()}/api/reports/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let jdata = await res.json().catch(() => {});
        appEvents.emit(AppEvents.alertError, [this.errorMsg(jdata?.message)]);
        callback();
        return;
      }

      let fileName = `${payload.name} Preview`;
      let fileExt = payload.reportType === ReportType.PDF ? 'pdf' : 'xlsx';
      let fileType =
        payload.reportType === ReportType.PDF
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const result = await res.blob();
      const buffer = await result.arrayBuffer();
      const blob = new Blob([buffer], {
        type: fileType,
      });
      const link = document.createElement('a');
      const href = window.URL.createObjectURL(blob);

      link.setAttribute('href', href);
      link.setAttribute('target', openInNewTab ? '_blank' : '_self');
      if (!openInNewTab) {
        link.setAttribute('download', `${fileName}.${fileExt}`);
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      appEvents.emit(AppEvents.alertError, [this.errorMsg()]);
    } finally {
      callback();
    }
  };

  onReportTypeChange = (value: any) => {
    this.setState({ selectedReportType: value });
  };

  onOrientationChange = (value: any) => {
    const selected = orientationOptions.find((e) => e.value === value) as DocumentOption;
    this.setState({ selectedOrientation: selected });
  };

  onLayoutChange = (value: DocumentOption) => {
    const selected = layoutOptions.find((e) => e.value === value) as DocumentOption;
    this.setState({ selectedLayout: selected });
  };

  getAvailableOptions = (): DocumentOption[] => {
    let availableOptions: DocumentOption[] = [];
    // If sharing a panel, only show PDF option
    if (this.props.panel) {
      availableOptions.push(reportTypeOptions[0]);
    }
    // Get the list of supported reports from dashboard variables
    const reportOptionsVar = this.props.dashboard.getVariables().filter((v) => v.name === 'supported_report_types');
    if (reportOptionsVar.length !== 0) {
      const rawOptions: string = (reportOptionsVar[0] as any).query;
      const options: string[] = rawOptions.toLocaleLowerCase().replace(' ', '').split(',');

      // Filter options
      const enabledOptions: string[] = options.filter((v) => ['pdf', 'xls'].includes(v));
      if (enabledOptions.length === 0) {
        availableOptions = reportTypeOptions;
      }

      availableOptions.push(...reportTypeOptions.filter((v) => enabledOptions.includes(v.value)));

      if (availableOptions.length === 0) {
        availableOptions = reportTypeOptions;
      }
    } else {
      availableOptions = reportTypeOptions;
    }

    return availableOptions;
  };

  render() {
    const { selectedLayout, selectedOrientation, selectedReportType, isProcessing, isDownload, isPreview } = this.state;
    const target = this.props.panel ? 'panel' : 'dashboard';
    const type = this.props.panel ? 'PDF' : selectedReportType?.value ?? '';
    const title = `Save the ${target} as ${type.toUpperCase()}`;
    const { onDismiss } = this.props;
    return (
      <div className="share-modal-body">
        <div className="share-modal-header">
          <Icon name="save" size="xxl" className="share-modal-big-icon" />
          <div className="share-modal-content">
            <h5 className="share-modal-info-text" style={{ paddingBottom: '24px' }}>
              {title}
            </h5>
            <div className="gf-form">
              <label className="gf-form-label width-8">Type</label>
              <Select
                width={32}
                disabled={this.props?.panel !== undefined}
                options={this.state.reportTypeOptions}
                defaultValue={this.state.reportTypeOptions[0]}
                value={this.state.selectedReportType}
                placeholder={'Select a report type'}
                onChange={this.onReportTypeChange}
              />
            </div>
            {selectedReportType?.value === ReportType.PDF && !this.props?.panel && (
              <>
                <div className="gf-form">
                  <label className="gf-form-label width-8">Layout</label>
                  <div className="width-16">
                    <RadioButtonGroup
                      options={layoutOptions}
                      value={selectedLayout.value}
                      onChange={this.onLayoutChange}
                      fullWidth
                    />
                  </div>
                </div>
                <div className="gf-form">
                  <label className="gf-form-label width-8">Orientation</label>
                  <div className="width-16">
                    <RadioButtonGroup
                      options={orientationOptions}
                      value={selectedOrientation.value}
                      onChange={this.onOrientationChange}
                      fullWidth
                    />
                  </div>
                </div>
              </>
            )}
            <div className="gf-form-button-row">
              <Button
                variant="primary"
                disabled={isProcessing || !selectedReportType}
                onClick={() => this.exportToDoc(false)}
                id="getDocument"
              >
                Download {type}
                {isProcessing && isDownload && <Spinner inline={true} style={{ paddingLeft: '8px' }}></Spinner>}
              </Button>
              {selectedReportType?.value === ReportType.PDF && (
                <Button
                  variant="secondary"
                  disabled={isProcessing || !selectedReportType}
                  onClick={() => this.exportToDoc(true)}
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
  }
}
