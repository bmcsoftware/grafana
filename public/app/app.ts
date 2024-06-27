import 'core-js';
import 'regenerator-runtime/runtime';
import 'symbol-observable';

import 'file-saver';
import 'jquery';
import 'whatwg-fetch'; // fetch polyfill needed for PhantomJs rendering
import './polyfills/old-mediaquerylist'; // Safari < 14 does not have mql.addEventListener()

import 'app/features/all';

import _ from 'lodash'; // eslint-disable-line lodash/import-scope
import React from 'react';
import ReactDOM from 'react-dom';
import { Store } from 'redux';

import {
  locationUtil,
  monacoLanguageRegistry,
  setLocale,
  setTimeZoneResolver,
  setWeekStart,
  standardEditorsRegistry,
  standardFieldConfigEditorRegistry,
  standardTransformersRegistry,
} from '@grafana/data';
import {
  locationService,
  registerEchoBackend,
  setBackendSrv,
  setDataSourceSrv,
  setEchoSrv,
  setLocationSrv,
  setQueryRunnerFactory,
  setRunRequest,
  setPluginImportUtils,
  setPluginExtensionGetter,
  setAppEvents,
  type GetPluginExtensions,
} from '@grafana/runtime';
import { setPanelDataErrorView } from '@grafana/runtime/src/components/PanelDataErrorView';
import { setPanelRenderer } from '@grafana/runtime/src/components/PanelRenderer';
import { setPluginPage } from '@grafana/runtime/src/components/PluginPage';
import { getScrollbarWidth } from '@grafana/ui';
import config from 'app/core/config';
import { arrayMove } from 'app/core/utils/arrayMove';
import { isGrafanaAdmin } from 'app/features/plugins/admin/permissions';
import { getStandardTransformers } from 'app/features/transformers/standardTransformers';
import { StoreState } from 'app/types';

import getDefaultMonacoLanguages from '../lib/monaco-languages';

import { AppWrapper } from './AppWrapper';
import appEvents from './core/app_events';
import { AppChromeService } from './core/components/AppChrome/AppChromeService';
import { getAllOptionEditors, getAllStandardFieldConfigs } from './core/components/OptionsUI/registry';
import { PluginPage } from './core/components/PageNew/PluginPage';
import { GrafanaContextType } from './core/context/GrafanaContext';
import { initializeI18n } from './core/internationalization';
import { interceptLinkClicks } from './core/navigation/patch/interceptLinkClicks';
import { ModalManager } from './core/services/ModalManager';
import { backendSrv } from './core/services/backend_srv';
import { contextSrv } from './core/services/context_srv';
import { Echo } from './core/services/echo/Echo';
import { reportPerformance } from './core/services/echo/EchoSrv';
import { PerformanceBackend } from './core/services/echo/backends/PerformanceBackend';
import { ApplicationInsightsBackend } from './core/services/echo/backends/analytics/ApplicationInsightsBackend';
import { GA4EchoBackend } from './core/services/echo/backends/analytics/GA4Backend';
import { GAEchoBackend } from './core/services/echo/backends/analytics/GABackend';
import { RudderstackBackend } from './core/services/echo/backends/analytics/RudderstackBackend';
import { GrafanaJavascriptAgentBackend } from './core/services/echo/backends/grafana-javascript-agent/GrafanaJavascriptAgentBackend';
import { SentryEchoBackend } from './core/services/echo/backends/sentry/SentryBackend';
import { getGainsightData } from './core/services/ims_srv';
import { KeybindingSrv } from './core/services/keybindingSrv';
import { initDevFeatures } from './dev';
import { getTimeSrv } from './features/dashboard/services/TimeSrv';
import { getFeatureStatus, loadFeatures, loadGrafanaFeatures } from './features/dashboard/services/featureFlagSrv';
import { updateConfigurableLinks, updateGainSightUserPreferences } from './features/dashboard/state/reducers';
import { customConfigSrv, CustomConfiguration } from './features/org/state/configuration';
import { PanelDataErrorView } from './features/panel/components/PanelDataErrorView';
import { PanelRenderer } from './features/panel/components/PanelRenderer';
import { DatasourceSrv } from './features/plugins/datasource_srv';
import { createPluginExtensionRegistry } from './features/plugins/extensions/createPluginExtensionRegistry';
import { getPluginExtensions } from './features/plugins/extensions/getPluginExtensions';
import { importPanelPlugin, syncGetPanelPlugin } from './features/plugins/importPanelPlugin';
import { preloadPlugins } from './features/plugins/pluginPreloader';
import { QueryRunner } from './features/query/state/QueryRunner';
import { runRequest } from './features/query/state/runRequest';
import { initWindowRuntime } from './features/runtime/init';
import { variableAdapters } from './features/variables/adapters';
import { createAdHocVariableAdapter } from './features/variables/adhoc/adapter';
import { createConstantVariableAdapter } from './features/variables/constant/adapter';
import { createCustomVariableAdapter } from './features/variables/custom/adapter';
import { createDataSourceVariableAdapter } from './features/variables/datasource/adapter';
import { createDatePickerVariableAdapter } from './features/variables/datepicker/adapter';
import { getVariablesUrlParams } from './features/variables/getAllVariableValuesForUrl';
import { createIntervalVariableAdapter } from './features/variables/interval/adapter';
import { createOptimizeVariableAdapter } from './features/variables/optimize/adapter';
import { setVariableQueryRunner, VariableQueryRunner } from './features/variables/query/VariableQueryRunner';
import { createQueryVariableAdapter } from './features/variables/query/adapter';
import { createSystemVariableAdapter } from './features/variables/system/adapter';
import { createTextBoxVariableAdapter } from './features/variables/textbox/adapter';
import { configureStore } from './store/configureStore';
import { TenantFeatureDTO } from './types/features';

// add move to lodash for backward compatabilty with plugins
// @ts-ignore
_.move = arrayMove;

// import symlinked extensions
const extensionsIndex = require.context('.', true, /extensions\/index.ts/);
const extensionsExports = extensionsIndex.keys().map((key) => {
  return extensionsIndex(key);
});

if (process.env.NODE_ENV === 'development') {
  initDevFeatures();
}

export class GrafanaApp {
  context!: GrafanaContextType;

  async init() {
    try {
      // Let iframe container know grafana has started loading
      parent.postMessage('GrafanaAppInit', '*');

      const initI18nPromise = initializeI18n(config.bootData.user.language);

      setBackendSrv(backendSrv);
      initEchoSrv();
      addClassIfNoOverlayScrollbar();
      setLocale(config.bootData.user.locale);
      setWeekStart(config.bootData.user.weekStart);
      setPanelRenderer(PanelRenderer);
      setPluginPage(PluginPage);
      setPanelDataErrorView(PanelDataErrorView);
      setLocationSrv(locationService);
      setTimeZoneResolver(() => config.bootData.user.timezone);

      // Expose the app-wide eventbus
      setAppEvents(appEvents);

      // We must wait for translations to load because some preloaded store state requires translating
      await initI18nPromise;

      // Important that extension reducers are initialized before store
      addExtensionReducers();
      // BMC code
      // configureStore();
      const store: Store<StoreState> = configureStore();
      // End
      initExtensions();

      //BMC code
      let tenantFeatureDTO = null;
      if (!isGrafanaAdmin()) {
        tenantFeatureDTO = await fetchTenantFeatures();
      }
      loadFeatures(tenantFeatureDTO);
      // End
      standardEditorsRegistry.setInit(getAllOptionEditors);
      standardFieldConfigEditorRegistry.setInit(getAllStandardFieldConfigs);
      standardTransformersRegistry.setInit(getStandardTransformers);
      // BMC code
      variableAdapters.setInit(() => {
        const adapters: any = [
          createQueryVariableAdapter(),
          createCustomVariableAdapter(),
          createTextBoxVariableAdapter(),
          createConstantVariableAdapter(),
          createDataSourceVariableAdapter(),
          createIntervalVariableAdapter(),
          createAdHocVariableAdapter(),
          createSystemVariableAdapter(),
          createDatePickerVariableAdapter(),
        ];
        const optimizeDomainPickerEnabled = getFeatureStatus('opt_domain_picker');
        if (optimizeDomainPickerEnabled) {
          adapters.push(createOptimizeVariableAdapter());
        }
        return adapters;
      });
      // End
      monacoLanguageRegistry.setInit(getDefaultMonacoLanguages);

      setQueryRunnerFactory(() => new QueryRunner());
      setVariableQueryRunner(new VariableQueryRunner());

      // Provide runRequest implementation to packages, @grafana/scenes in particular
      setRunRequest(runRequest);

      // Privide plugin import utils to packages, @grafana/scenes in particular
      setPluginImportUtils({
        importPanelPlugin,
        getPanelPluginFromCache: syncGetPanelPlugin,
      });

      locationUtil.initialize({
        config,
        getTimeRangeForUrl: getTimeSrv().timeRangeForUrl,
        getVariablesUrlParams: getVariablesUrlParams,
      });

      // intercept anchor clicks and forward it to custom history instead of relying on browser's history
      document.addEventListener('click', interceptLinkClicks);

      // Init DataSourceSrv
      const dataSourceSrv = new DatasourceSrv();
      dataSourceSrv.init(config.datasources, config.defaultDatasource);
      setDataSourceSrv(dataSourceSrv);
      initWindowRuntime();

      // init modal manager
      const modalManager = new ModalManager();
      modalManager.init();

      // Preload selected app plugins
      const preloadResults = await preloadPlugins(config.apps);

      // Create extension registry out of the preloaded plugins
      const pluginExtensionGetter: GetPluginExtensions = (options) =>
        getPluginExtensions({ ...options, registry: createPluginExtensionRegistry(preloadResults) });
      setPluginExtensionGetter(pluginExtensionGetter);

      // initialize chrome service
      const queryParams = locationService.getSearchObject();
      const chromeService = new AppChromeService();
      const keybindingsService = new KeybindingSrv(locationService, chromeService);

      // Read initial kiosk mode from url at app startup
      chromeService.setKioskModeFromUrl(queryParams.kiosk);

      this.context = {
        backend: backendSrv,
        location: locationService,
        chrome: chromeService,
        keybindings: keybindingsService,
        config,
      };

      // BMC code
      // Uncomment below code snippet to enable feature flag
      await loadConfigurableLinks(store);

      let disableGainSight = queryParams.disableGainSight;
      // Suppress the error
      if (getFeatureStatus('gainsight') && !disableGainSight) {
        await loadGainSightScript(store).catch((e: any) => {
          return true;
        });
      }
      // End

      ReactDOM.render(
        React.createElement(AppWrapper, {
          app: this,
        }),
        document.getElementById('reactRoot')
      );
    } catch (error) {
      console.error('Failed to start Grafana', error);
      window.__grafana_load_failed();
    }
  }
}

function addExtensionReducers() {
  if (extensionsExports.length > 0) {
    extensionsExports[0].addExtensionReducers();
  }
}

function initExtensions() {
  if (extensionsExports.length > 0) {
    extensionsExports[0].init();
  }
}

function initEchoSrv() {
  setEchoSrv(new Echo({ debug: process.env.NODE_ENV === 'development' }));

  window.addEventListener('load', (e) => {
    const loadMetricName = 'frontend_boot_load_time_seconds';
    // Metrics below are marked in public/views/index-template.html
    const jsLoadMetricName = 'frontend_boot_js_done_time_seconds';
    const cssLoadMetricName = 'frontend_boot_css_time_seconds';

    if (performance) {
      performance.mark(loadMetricName);
      reportMetricPerformanceMark('first-paint', 'frontend_boot_', '_time_seconds');
      reportMetricPerformanceMark('first-contentful-paint', 'frontend_boot_', '_time_seconds');
      reportMetricPerformanceMark(loadMetricName);
      reportMetricPerformanceMark(jsLoadMetricName);
      reportMetricPerformanceMark(cssLoadMetricName);
    }
  });

  if (contextSrv.user.orgRole !== '') {
    registerEchoBackend(new PerformanceBackend({}));
  }

  if (config.sentry.enabled) {
    registerEchoBackend(
      new SentryEchoBackend({
        ...config.sentry,
        user: config.bootData.user,
        buildInfo: config.buildInfo,
      })
    );
  }
  if (config.grafanaJavascriptAgent.enabled) {
    registerEchoBackend(
      new GrafanaJavascriptAgentBackend({
        ...config.grafanaJavascriptAgent,
        app: {
          version: config.buildInfo.version,
          environment: config.buildInfo.env,
        },
        buildInfo: config.buildInfo,
        user: {
          id: String(config.bootData.user?.id),
          email: config.bootData.user?.email,
        },
      })
    );
  }

  if (config.googleAnalyticsId) {
    registerEchoBackend(
      new GAEchoBackend({
        googleAnalyticsId: config.googleAnalyticsId,
      })
    );
  }

  if (config.googleAnalytics4Id) {
    registerEchoBackend(
      new GA4EchoBackend({
        googleAnalyticsId: config.googleAnalytics4Id,
        googleAnalytics4SendManualPageViews: config.googleAnalytics4SendManualPageViews,
      })
    );
  }

  if (config.rudderstackWriteKey && config.rudderstackDataPlaneUrl) {
    registerEchoBackend(
      new RudderstackBackend({
        writeKey: config.rudderstackWriteKey,
        dataPlaneUrl: config.rudderstackDataPlaneUrl,
        user: config.bootData.user,
        sdkUrl: config.rudderstackSdkUrl,
        configUrl: config.rudderstackConfigUrl,
      })
    );
  }

  if (config.applicationInsightsConnectionString) {
    registerEchoBackend(
      new ApplicationInsightsBackend({
        connectionString: config.applicationInsightsConnectionString,
        endpointUrl: config.applicationInsightsEndpointUrl,
      })
    );
  }
}

function addClassIfNoOverlayScrollbar() {
  if (getScrollbarWidth() > 0) {
    document.body.classList.add('no-overlay-scrollbar');
  }
}

/**
 * Report when a metric of a given name was marked during the document lifecycle. Works for markers with no duration,
 * like PerformanceMark or PerformancePaintTiming (e.g. created with performance.mark, or first-contentful-paint)
 */
function reportMetricPerformanceMark(metricName: string, prefix = '', suffix = ''): void {
  const metric = _.first(performance.getEntriesByName(metricName));
  if (metric) {
    const metricName = metric.name.replace(/-/g, '_');
    reportPerformance(`${prefix}${metricName}${suffix}`, Math.round(metric.startTime) / 1000);
  }
}

// BMC code

// Uncomment below code snippet to enable feature flag
async function fetchTenantFeatures(): Promise<TenantFeatureDTO[] | null> {
  const response = await Promise.all([
    backendSrv.get('/tenantfeatures'),
    loadGrafanaFeatures().catch((e) => {
      console.log(e);
    }),
  ]);
  return response[0];
}

// <!-- BMC code - Gainsight PX Tag-->
const loadGainSightScript = async (store: Store<StoreState>): Promise<any> => {
  // Get GS-Tag from IMS userinfo endpoint
  let { gsTag, preferences, tenantDomainName, userRoleNames } = await getGainsightData();
  await store.dispatch(updateGainSightUserPreferences(preferences));

  if (!gsTag) {
    return;
  }

  const user = contextSrv.user;
  const userDetails: any = {};
  const accountDetails: any = {};

  userDetails.id = user.id;
  userDetails.itomRoles = userRoleNames;
  accountDetails.name = user.orgName;
  accountDetails.id = user.orgId;
  accountDetails.website = tenantDomainName;

  const url = 'https://documents.bmc.com/products/docs/gainsight/main/aptrinsic.js';
  const param = gsTag;
  const i = 'aptrinsic';
  (window as any)[i] =
    (window as any)[i] ||
    function () {
      ((window as any)[i].q = (window as any)[i].q || []).push(arguments);
    };
  (window as any)[i].p = param;
  (window as any)[i].c = {
    cssFileEndpoint: 'https://documents.bmc.com/products/docs/gainsight/main/style.css',
    widgetFileEndpoint: 'https://documents.bmc.com/products/docs/gainsight/main/aptrinsic-widget.js',
    widgetNonce: window.nonce,
  };
  const node = document.createElement('script');
  node.async = true;
  node.src = url + '?a=' + param;
  const script = document.getElementsByTagName('script')[0];
  const bhdVersion = (config.bootData.settings as any).bhdVersion;
  node.onload = (_: any) => {
    console.log('Gainsight is loaded');
    (window as any)[i]('identify', userDetails, accountDetails);
    (window as any)[i]('set', 'globalContext', { application: 'dashboards' });
    // setting version in global context for IDD
    (window as any)[i]('set', 'globalContext', { version: bhdVersion });
  };
  node.onerror = (error: any) => {
    console.error('An error occurred while loading GainSight script; reason: ', error);
  };
  script?.parentNode?.insertBefore(node, script);
};

const loadConfigurableLinks = async (store: Store<StoreState>): Promise<CustomConfiguration> => {
  const cLs = await customConfigSrv.getCustomConfiguration();
  store.dispatch(updateConfigurableLinks(cLs));
  return cLs;
};
// <!-- BMC code - Gainsight PX Tag-->
// End
export default new GrafanaApp();
