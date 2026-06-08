# **_Change details in Grafana v12.2.9_**

# **_Rebranding:_**

#### Theme, Logo, and App name

- …/public/img -> 'apple-touch-icon.png', 'fav32.png', 'grafana_com_auth_icon.svg', 'grafana_mask_icon_white.svg', 'grafana_mask_icon.svg', 'grafana_icon.svg', 'apple-touch-icon_org.png', 'dashboard_icon.svg', 'fav32_org.png', 'grafana_com_auth_icon_org.svg', 'grafana_icon_org.svg', 'grafana_mask_icon_org.svg', 'grafana_mask_icon_white_org.svg'
- …/public/app/core/components/Branding -> 'Branding.tsx'
- …/public/app/features/admin -> 'LicenseChrome.tsx'
- …/public/app/features/datasources/state -> 'buildCategories.ts'
- …/public/app/plugins/panel/welcome -> 'Welcome.tsx'

#### JSON changes
- …/public/locales/en-US -> 'grafana.json'
- …/public/dashboards -> 'default.json'


#### Not Found or Route Error

- …/public/app/core/navigation -> 'GrafanaRouteError.tsx'
- …/public/app/core/components/PageNotFound -> 'EntityNotFound.tsx'


## Dashboard & Dashboard Panel

- …/public/app/features/dashboard-scene/edit-pane -> 'DashboardEditPaneSplitter.tsx'
- …/public/app/features/dashboard-scene/scene -> 'DashboardControls.tsx'
- …/public/app/features/dashboard/dashgrid/PanelHeader -> 'PanelHeaderCorner.tsx'
- …/public/app/features/dashboard-scene/scene -> 'PanelMenuBehavior.tsx'
- …/public/app/features/dashboard-scene/serialization -> 'transformSaveModelToScene.ts'
- …/packages/grafana-ui/src/components/DateTimePickers -> 'TimeRangePicker.tsx'
- …/packages/grafana-ui/src/components/DateTimePickers/TimeRangePicker -> 'TimePickerContent.tsx'
- …/packages/grafana-ui/src/components/Menu ->  'MenuItem.tsx'
- …/public/app/core/components/AppChrome -> 'AppChrome.tsx'
- …/packages/grafana-ui/src/components/RefreshPicker -> 'RefreshPicker.tsx'
- …/public/app/features/dashboard-scene/scene -> 'DashboardScene.tsx'
- …/public/app/features/dashboard-scene/scene -> 'setDashboardPanelContext.ts'
- …/public/app/features/dashboard/components/DashboardLoading -> 'DashboardLoading.tsx'

#### HTML Template

- …/public/views --> 'index.html'


#### Disabled all the routes except dashboard

- …/public/app/routes -> ‘routes.tsx’


# **_Hide/Disable Features from Grafana UI:_**

#### Graph Legend and tooltip Customization - to remove double quote from names

- …/packages/grafana-ui/src/components/VizLegend -> 'VizLegendListItem.tsx'
- …/packages/grafana-ui/src/components/VizTooltip -> 'VizTooltipRow.tsx'


#### Add user with viewer role

- …/pkg/services/sqlstore -> ‘sqlstore.go’

#### API endpoint changes

- …/pkg/api -> 'index.go'


#### API Call

- …/public/app/core/services/echo/backends -> 'PerformanceBackend.ts’

#### Minor Changes

- …/pkg/services/provisioning/values -> 'values.go'