import { css } from '@emotion/css';
import React, { FormEvent, PureComponent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AppEvents, GrafanaTheme2, LoadingState, NavModelItem } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { reportInteraction } from '@grafana/runtime';
import {
  Button,
  Field,
  // FileUpload,
  Form,
  HorizontalGroup,
  // Input,
  Spinner,
  stylesFactory,
  TextArea,
  Themeable2,
  VerticalGroup,
  withTheme2,
} from '@grafana/ui';
import appEvents from 'app/core/app_events';
import { Page } from 'app/core/components/Page/Page';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';

import { cleanUpAction } from '../../core/actions/cleanUp';

// BMC Code: Next line
import {
  Import,
  ImportOperationProvider,
  useImportOperations,
  FilesUpload,
  initialImportDashboardState as iDashboardsState,
  bulkLimit,
  bulkLimitMsg,
} from './bulkoperation/pages/import';
import { ImportDashboardOverview } from './components/ImportDashboardOverview';
import {
  fetchGcomDashboard,
  importDashboardJson,
  fetchDashboards,
  dashboardLoaded,
  clearLoadedDashboard,
} from './state/actions';
import { initialImportDashboardState } from './state/reducers';
import { validateDashboardJson } from './utils/validation';

type DashboardImportPageRouteSearchParams = {
  gcomDashboardId?: string;
};

type OwnProps = Themeable2 & GrafanaRouteComponentProps<{}, DashboardImportPageRouteSearchParams>;

const IMPORT_STARTED_EVENT_NAME = 'dashboard_import_loaded';

const mapStateToProps = (state: StoreState) => ({
  loadingState: state.importDashboard.state,
  // BMC Code: Next line
  navModel: getNavModel(state.navIndex, 'dashboards/import', undefined, true),
  isMultiple: state.importDashboard.multiple,
});

const mapDispatchToProps = {
  fetchGcomDashboard,
  importDashboardJson,
  cleanUpAction,
  // BMC Code: Next 3 lines
  fetchDashboards,
  dashboardLoaded,
  clearLoadedDashboard,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type Props = OwnProps & ConnectedProps<typeof connector>;

class UnthemedDashboardImport extends PureComponent<Props> {
  constructor(props: Props) {
    super(props);
    const { gcomDashboardId } = this.props.queryParams;
    if (gcomDashboardId) {
      this.getGcomDashboard({ gcomDashboard: gcomDashboardId });
      return;
    }
  }

  componentWillUnmount() {
    this.props.cleanUpAction({ cleanupAction: (state) => (state.importDashboard = initialImportDashboardState) });
  }

  onFileUpload = (event: FormEvent<HTMLInputElement>) => {
    reportInteraction(IMPORT_STARTED_EVENT_NAME, {
      import_source: 'json_uploaded',
    });

    const { importDashboardJson } = this.props;
    const file = event.currentTarget.files && event.currentTarget.files.length > 0 && event.currentTarget.files[0];

    if (file) {
      const reader = new FileReader();
      const readerOnLoad = () => {
        return (e: any) => {
          let dashboard: any;
          try {
            dashboard = JSON.parse(e.target.result);
          } catch (error) {
            if (error instanceof Error) {
              appEvents.emit(AppEvents.alertError, [
                'Import failed',
                'JSON -> JS Serialization failed: ' + error.message,
              ]);
            }
            return;
          }
          importDashboardJson(dashboard);
        };
      };
      reader.onload = readerOnLoad();
      reader.readAsText(file);
    }
  };

  getDashboardFromJson = (formData: { dashboardJson: string }) => {
    reportInteraction(IMPORT_STARTED_EVENT_NAME, {
      import_source: 'json_pasted',
    });

    this.props.importDashboardJson(JSON.parse(formData.dashboardJson));
  };

  getGcomDashboard = (formData: { gcomDashboard: string }) => {
    reportInteraction(IMPORT_STARTED_EVENT_NAME, {
      import_source: 'gcom',
    });

    let dashboardId;
    const match = /(^\d+$)|dashboards\/(\d+)/.exec(formData.gcomDashboard);
    if (match && match[1]) {
      dashboardId = match[1];
    } else if (match && match[2]) {
      dashboardId = match[2];
    }

    if (dashboardId) {
      this.props.fetchGcomDashboard(dashboardId);
    }
  };

  renderImportForm() {
    const styles = importStyles(this.props.theme);

    return (
      <>
        {/* BMC code */}
        <div className={styles.option}>
          {/* <FileUpload accept="application/json" onFileUpload={this.onFileUpload}>
              Upload JSON file
            </FileUpload> */}

          <_FilesUpload
            onFileUpload={this.onFileUpload}
            fetchDashboards={this.props.fetchDashboards}
            dashboardLoaded={this.props.dashboardLoaded}
            clearLoadedDashboard={this.props.clearLoadedDashboard}
          />
        </div>
        {/* <div className={styles.option}>
          <Form onSubmit={this.getGcomDashboard} defaultValues={{ gcomDashboard: '' }}>
            {({ register, errors }) => (
              <Field
                label="Import via grafana.com"
                invalid={!!errors.gcomDashboard}
                error={errors.gcomDashboard && errors.gcomDashboard.message}
              >
                <Input
                  id="url-input"
                  placeholder="Grafana.com dashboard URL or ID"
                  type="text"
                  {...register('gcomDashboard', {
                    required: 'A Grafana dashboard URL or ID is required',
                    validate: validateGcomDashboard,
                  })}
                  addonAfter={<Button type="submit">Load</Button>}
                />
              </Field>
            )}
          </Form>
        </div> */}
        {/* End */}
        <div className={styles.option}>
          <Form onSubmit={this.getDashboardFromJson} defaultValues={{ dashboardJson: '' }}>
            {({ register, errors }) => (
              <>
                <Field
                  label="Import via dashboard json"
                  invalid={!!errors.dashboardJson}
                  error={errors.dashboardJson && errors.dashboardJson.message}
                >
                  <TextArea
                    {...register('dashboardJson', {
                      required: 'Need a dashboard JSON model',
                      validate: validateDashboardJson,
                    })}
                    data-testid={selectors.components.DashboardImportPage.textarea}
                    id="dashboard-json-textarea"
                    rows={10}
                  />
                </Field>
                <Button type="submit" data-testid={selectors.components.DashboardImportPage.submit}>
                  Load
                </Button>
              </>
            )}
          </Form>
        </div>
      </>
    );
  }

  pageNav: NavModelItem = {
    text: 'Import dashboard',
    // BMC code - inline change
    subTitle: 'Import dashboard from file or via dashboard json',
    breadcrumbs: [{ title: 'Dashboards', url: 'dashboards' }],
  };

  render() {
    const { loadingState, isMultiple } = this.props;

    return (
      // BMC code
      <ImportOperationProvider initialState={{ ...iDashboardsState }}>
        <Page navId="dashboards/browse" pageNav={this.pageNav}>
          <Page.Contents>
            {loadingState === LoadingState.Loading && (
              <VerticalGroup justify="center">
                <HorizontalGroup justify="center">
                  <Spinner size={32} />
                </HorizontalGroup>
              </VerticalGroup>
            )}
            {[LoadingState.Error, LoadingState.NotStarted].includes(loadingState) && this.renderImportForm()}
            {loadingState === LoadingState.Done && !isMultiple && <ImportDashboardOverview />}
            {loadingState === LoadingState.Done && isMultiple && (
              <Import clearLoadedDashboard={this.props.clearLoadedDashboard} />
            )}
          </Page.Contents>
        </Page>
      </ImportOperationProvider>
      // End
    );
  }
}

const DashboardImportUnConnected = withTheme2(UnthemedDashboardImport);
const DashboardImport = connector(DashboardImportUnConnected);
DashboardImport.displayName = 'DashboardImport';
export default DashboardImport;

const importStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    option: css`
      margin-bottom: ${theme.spacing(4)};
    `,
  };
});

// BMC Code: Below file
const _FilesUpload: React.FC<any> = ({ onFileUpload, fetchDashboards, dashboardLoaded, clearLoadedDashboard }) => {
  const importOperations = useImportOperations();
  return (
    <>
      <FilesUpload
        accept="application/json"
        onFileUpload={async (files: any) => {
          await importOperations.clearAllDashboard();
          if (!files || !files.length) {
            return;
          }
          if (files.length === 1) {
            onFileUpload({ currentTarget: { files: [files[0]] } });
          } else if (files.length > bulkLimit) {
            appEvents.emit(AppEvents.alertWarning, ['Import failed', bulkLimitMsg]);
          } else {
            fetchDashboards();
            const readFile = async (file: any) => {
              return new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onabort = rej;
                reader.onload = () => {
                  try {
                    const dashboard = JSON.parse(reader.result as string);
                    importOperations.importDashboardJson(file.id, dashboard);
                    res(true);
                  } catch (error) {
                    rej(error);
                  }
                };
                reader.onerror = rej;
                reader.readAsText(file.file);
              });
            };
            return await Promise.all(
              new Array(files.length).fill(null).map((_, index) => {
                return readFile({
                  id: getFileName(files[index].name),
                  file: files[index],
                  error: null,
                }).catch((error) => {
                  appEvents.emit(AppEvents.alertError, [
                    'Import failed',
                    'JSON -> JS Serialization failed: ' + error.message,
                  ]);
                });
              })
            )
              .then((results) => {
                if (results.find((res) => res)) {
                  dashboardLoaded();
                } else {
                  clearLoadedDashboard();
                }
              })
              .catch((err) => {
                appEvents.emit(AppEvents.alertError, ['Import failed', err.message]);
                clearLoadedDashboard();
              });
          }
        }}
      >
        {'Upload JSON file(s)'}
      </FilesUpload>
    </>
  );
};

const getFileName = (fileName: string) => {
  const delimiter = fileName.lastIndexOf('.');
  return fileName.substring(0, delimiter);
};
