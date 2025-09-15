# **_Change details in Grafana v12.1.1_**

# **_Rebranding:_**

#### Theme, Logo, and App name

- …/public/img -> 'apple-touch-icon.png', 'fav32.png', 'grafana_com_auth_icon.svg', 'grafana_mask_icon_white.svg', 'grafana_mask_icon.svg', 'grafana_icon.svg'
- …/public/app/features/admin -> 'LicenseChrome.tsx'
- …/public/app/features/datasources/state -> 'buildCategories.ts'
- …/public/app/plugins/panel/welcome -> 'Welcome.tsx'

### Vulnerability Fix

- e2e/test-plugins/grafana-extensionstest-app -> 'webpack.config.ts'
- e2e/test-plugins/grafana-test-datasource -> 'webpack.config.ts'
- packages/grafana-plugin-configs -> 'webpack.config.ts'
- public/app/plugins/datasource/azuremonitor -> 'webpack.config.ts'
- public/app/plugins/datasource/grafana-pyroscope-datasource -> 'webpack.config.ts'
- public/app/plugins/datasource/jaeger -> 'webpack.config.ts'
- public/app/plugins/datasource/mssql -> 'webpack.config.ts'


### Version Changes

- .citools/src/golangci-lint -> 'go.mod'
- .citools/src/golangci-lint -> 'go.sum'
- .citools/src/lefthook -> 'go.mod'
- .citools/src/lefthook -> 'go.sum'
- .citools/src/swagger -> 'go.mod'
- .citools/src/swagger -> 'go.sum'
- apps/advisor -> 'go.mod'
- apps/advisor -> 'go.sum'
- apps/investigations -> 'go.mod'
- apps/investigations -> 'go.sum'
- 'go.mod'
- 'go.sum'

### Not Found or Route Error

- …/public/app/core/navigation -> 'GrafanaRouteError.tsx'
- …/public/app/core/components/PageNotFound -> 'EntityNotFound.tsx'


### Dashboard & Dashboard Panel

- …/public/app/features/dashboard-scene/edit-pane -> 'DashboardEditPaneSplitter.tsx'
- …/public/app/features/dashboard-scene/scene -> 'DashboardControls.tsx'
- …/public/app/features/dashboard/dashgrid/PanelHeader -> 'PanelHeaderCorner.tsx'
- …/public/app/features/dashboard-scene/scene -> 'PanelMenuBehavior.tsx'
- …/public/app/features/dashboard-scene/scene -> 'keyboardShortcuts.ts'
- …/public/app/features/dashboard-scene/serialization -> 'transformSaveModelToScene.ts'
- …/packages/grafana-ui/src/components/DateTimePickers -> 'TimeRangePicker.tsx'
- …/packages/grafana-ui/src/components/DateTimePickers/TimeRangePicker -> 'TimePickerContent.tsx'
- …/packages/grafana-ui/src/components/Menu ->  'MenuItem.tsx'
- …/public/app/core/components/AppChrome -> 'AppChrome.tsx'
- …/public/app/features/dashboard/utils -> 'getPanelMenu.ts'
- …/public/app/core/components/AppChrome -> 'AppChrome.tsx'
- …/packages/grafana-ui/src/components/RefreshPicker -> 'RefreshPicker.tsx'
- …/public/app/features/dashboard-scene/scene -> 'DashboardScene.tsx'
- …/public/app/features/dashboard-scene/scene -> 'setDashboardPanelContext.ts'
- …/public/app/features/dashboard/components/DashboardLoading -> 'DashboardLoading.tsx'

### Page layout
- …/packages/grafana-ui/src/components/PageLayout -> 'PageToolbar.tsx’

### Disabled all the routes except dashboard

- …/public/app/routes -> ‘routes.tsx’

# **_Hide/Disable Features from Grafana UI:_**

### Graph Legend Customization - to remove double quote from names

- …/packages/grafana-ui/src/components/VizLegend -> 'VizLegendListItem.tsx'
- …/packages/grafana-ui/src/components/VizTooltip -> 'VizTooltipRow.tsx'


### Add user with viewer role

- …/pkg/services/sqlstore -> ‘sqlstore.go’

### API Call

- …/public/app/core/services/echo/backends -> PerformanceBackend.ts’