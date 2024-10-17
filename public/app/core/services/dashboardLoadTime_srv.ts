
import { LoadingState } from '@grafana/data';
import config from 'app/core/config';
import { getBackendSrv } from 'app/core/services/backend_srv';


const POST_FRONTEND_METRICS = "/api/frontend-metrics";


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
    this.dashboardInfo = { name: "", panelIsInViewCount: 0, dashboardInEdit: false};
    this.dashboardPanelRendered = 0;
    this.dashboardPanelRenderedFailed = false;
    this.setDashboardInfo = this.setDashboardInfo.bind(this);
    this.setDashboardPanelRendered = this.setDashboardPanelRendered.bind(this);
    this.reset = this.reset.bind(this);
  }


  public setDashboardInfo(dashboardInfo: any) {
    this.dashboardInfo = dashboardInfo ;
  }

  public setDashboardPanelRendered(panelStatus: LoadingState) {
    if (!this.dashboardInfo.dashboardInEdit) {
        if (panelStatus === LoadingState.Done) {
          this.dashboardPanelRendered = this.dashboardPanelRendered + 1;
        } else if (panelStatus === LoadingState.Error) {
          this.dashboardPanelRenderedFailed = true;
        }
        this.checkDashboardIsReady();
      }
  }

  public reset() {
    this.loadTimeRecorded = false;
    this.startTime = new Date().getTime();
    this.dashboardInfo =  { id:"", name: "", panelIsInViewCount: 0, dashboardInEdit: false };
    this.dashboardPanelRendered = 0;
    this.dashboardPanelRenderedFailed = false;
  } 

  private checkDashboardIsReady(): void {
    if (!this.loadTimeRecorded && 
        !this.dashboardPanelRenderedFailed && 
        !this.dashboardInfo.dashboardInEdit &&
         this.startTime && 
         this.dashboardInfo.panelIsInViewCount && 
         this.dashboardInfo.panelIsInViewCount === this.dashboardPanelRendered) {
      const END_TIME = new Date().getTime();
      const loadTime = Math.round((END_TIME - this.startTime) / 1000);
      this.loadTimeRecorded= true;
      console.log(`The ${this.dashboardInfo.name}, dashboard load time: ${loadTime}`);

      // Post dashboard insight 
      getBackendSrv().post(POST_FRONTEND_METRICS, this.constructPostRequest(loadTime, this.dashboardInfo.id), {retry:0,showErrorAlert:false});
    }
  }

  private constructPostRequest(loadTime: number, dashboardId: string): any {
    let postBody = {
      "events": [
        {
          "name": "api_dashboard_loadtime",
          "value": loadTime,
          "labels": {
            "dashboard_id": dashboardId,
            "tenant_id": config.bootData.user.orgId
          }
        },
        {
          "name": "api_user_dashboard_hit",
          "value": 1,
          "labels": {
            "user_id": config.bootData.user.id,
            "tenant_id": config.bootData.user.orgId
          }
        }
      ]
    };
    return postBody;
  }

  public static get Instance()
  {
      return this._instance || (this._instance = new this());
  }

}

export const dashboardLoadTime = DashboardLoadTime.Instance;
