import { LoadingState } from '@grafana/data';
import config from 'app/core/config';
import { getBackendSrv } from 'app/core/services/backend_srv';

const POST_FRONTEND_METRICS = '/api/frontend-metrics';

class DashboardLoadTime {
  static _instance: DashboardLoadTime;
  private loadTimeRecorded: boolean | false;
  private startTime: number | 0;
  private dashboardInfo: any | {};
  private dashboardPanelRendered: number | 0;
  private dashboardPanelRenderedFailed: boolean | false;

  constructor() {
    this.loadTimeRecorded = false;
    this.startTime = 0;
    this.dashboardInfo = { name: '', panelIsInViewCount: 0, dashboardInEdit: false };
    this.dashboardPanelRendered = 0;
    this.dashboardPanelRenderedFailed = false;
    this.setDashboardInfo = this.setDashboardInfo.bind(this);
    this.setDashboardPanelRendered = this.setDashboardPanelRendered.bind(this);
    this.reset = this.reset.bind(this);
  }

  public setDashboardInfo(dashboardInfo: any) {
    this.dashboardInfo = dashboardInfo;
  }

  public setDashboardPanelRendered(panelStatus: LoadingState) {
    if (!this.dashboardInfo.dashboardInEdit) {
      if (panelStatus === LoadingState.Done) {
        this.dashboardPanelRendered = this.dashboardPanelRendered + 1;
      } else if (panelStatus === LoadingState.Error) {
        // Counting as rendered even for if panel has error, since it is still counted as a valid view (for usage data API)
        this.dashboardPanelRendered = this.dashboardPanelRendered + 1;
        this.dashboardPanelRenderedFailed = true;
      }
      this.checkDashboardIsReady();
    }
  }

  public reset() {
    this.loadTimeRecorded = false;
    this.startTime = new Date().getTime();
    this.dashboardInfo = { id: '', name: '', panelIsInViewCount: 0, dashboardInEdit: false };
    this.dashboardPanelRendered = 0;
    this.dashboardPanelRenderedFailed = false;
  }

  private checkDashboardIsReady(): void {
    if (
      !this.isPuppeteer() &&
      !this.loadTimeRecorded &&
      !this.dashboardInfo.dashboardInEdit &&
      this.startTime &&
      this.dashboardInfo.panelIsInViewCount &&
      this.dashboardInfo.panelIsInViewCount === this.dashboardPanelRendered
    ) {
      const END_TIME = new Date().getTime();
      const loadTime = Math.round((END_TIME - this.startTime) / 1000);
      this.loadTimeRecorded = true;
      console.log(`The ${this.dashboardInfo.name}, dashboard load time: ${loadTime}`);

      // Post dashboard insight
      getBackendSrv().post(
        POST_FRONTEND_METRICS,
        this.constructPostRequest(loadTime, this.dashboardInfo.id, !this.dashboardPanelRenderedFailed),
        {
          retry: 0,
          showErrorAlert: false,
        }
      );
    }
  }

  private isPuppeteer = () => navigator.webdriver === true;

  private constructPostRequest(loadTime: number, dashboardId: string, dashboardAllPanelsLoadedSuccess: boolean): any {
    let postBody = {
      events: [
        {
          name: 'api_dashboard_hit',
          value: 1,
          labels: {
            dashboard_id: dashboardId?.toString(),
            tenant_id: config.bootData.user.orgId?.toString(),
          },
        },
        {
          name: 'api_dashboard_hit_with_user_info',
          value: 1,
          labels: {
            dashboard_id: dashboardId?.toString(),
            user_id: config.bootData.user.id?.toString(),
            tenant_id: config.bootData.user.orgId?.toString(),
          },
        },
        {
          name: 'api_user_dashboard_hit',
          value: 1,
          labels: {
            user_id: config.bootData.user.id?.toString(),
            tenant_id: config.bootData.user.orgId?.toString(),
          },
        },
      ],
    };
    if (dashboardAllPanelsLoadedSuccess) {
      // we consider load time metric only if all panels in view have been loaded sucessfully .
      postBody.events.push({
        name: 'api_dashboard_loadtime',
        value: loadTime,
        labels: {
          dashboard_id: dashboardId?.toString(),
          tenant_id: config.bootData.user.orgId?.toString(),
        },
      });
    }
    return postBody;
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}

export const dashboardLoadTime = DashboardLoadTime.Instance;
