# **_Change details in Grafana v11.5.2_**

# **_Rebranding:_**

#### Theme, Logo, and App name

- …/public/img -> ‘apple-touch-icon.png’, ‘fav32.png’, ‘grafana_com_auth_icon.svg’, ‘grafana_mask_icon_white.svg’, ‘grafana_mask_icon.svg’, ‘grafana_icon.svg’
- …/public/views -> ‘index.html’
- …/public/app/core/components/Branding -> ‘Branding.tsx’
- …/public/dashboards -> ‘default.json’
- …/public/locales/en-US -> 'grafana.json'
- …/public/locales/es-ES -> 'grafana.json'
- …/public/locales/fr-FR -> 'grafana.json'
- …/public/locales/pt-BR -> 'grafana.json'
- …/public/locales/zh-Hans -> 'grafana.json'
- …/public/app/plugins/panel/welcome -> ‘Welcome.tsx’
- …/public/app/features/datasources/state -> ‘buildCategories.ts’
- …/public/app/features/admin -> LicenseChrome.tsx’
- …/packages/grafana-ui/src/components/DateTimePickers -> ‘TimeRangePicker.tsx’
- …/packages/grafana-ui/src/components/DateTimePickers/TimeRangePicker -> ‘TimePickerContent.tsx’
- …/packages/grafana-ui/src/components/RefreshPicker -> 'RefreshPicker.tsx'
- …/pkg/api -> ‘index.go’

#### Error Pages

- …/public/views -> 'index.html'
- …/public/app/core/navigations -> 'GrafanaRouteError.tsx'
- …/public/app/core/components/PageNotFound -> 'EntityNotFound.tsx'

#### Error Pages

- …/public/views -> 'index.html'
- …/public/app/core/navigations -> 'GrafanaRouteError.tsx'

# **_Welcome/Landing page:_**

### Dashboard Loading

- …public/app/features/dashboard/components/DashboardLoading -> ‘DashboardLoading.tsx’

### New bmc logo

- …/public/img -> ‘dashboard_icon.svg’

# **_Hide/Disable Features from Grafana UI:_**

### Document, Community, Support

- …/packages/grafana-ui/src/components/DateTimePickers/TimeRangePicker -> ‘TimePickerContent.tsx’

### Dashboard & Dashboard Panel

- …/public/app/features/dashboard-scene/edit-pane -> 'DashboardEditPaneSplitter.tsx'
- …/public/app/features/dashboard-scene/scene -> 'DashboardControls.tsx'
- …/public/app/features/dashboard/dashgrid/PanelHeader -> ‘PanelHeaderCorner.tsx’
- …/public/app/features/dashboard-scene/scene -> 'PanelMenuBehavior.tsx'
- …/public/app/features/dashboard-scene/scene -> 'keyboardShortcuts.ts'
- …/public/app/features/dashboard-scene/serialization -> 'transformSaveModelToScene.ts'
- …/packages/grafana-ui/src/components/Menu ->  'MenuItem.tsx'
- …/public/app/core/components/AppChrome -> 'AppChrome.tsx'
- …/public/app/features/dashboard/utils -> 'getPanelMenu.ts'
- …/public/app/core/components/AppChrome -> 'AppChrome.tsx’

### Page layout
- …/packages/grafana-ui/src/components/PageLayout -> 'PageToolbar.tsx’

### Disabled all the routes except dashboard

- …/public/app/routes -> ‘routes.tsx’

# **_Hide/Disable Features from Grafana UI:_**

### Graph Legend Customization - to remove double quote from names

- …/packages/grafana-ui/src/components/VizLegend -> 'VizLegendListItem.tsx'

### Add user with viewer role

- …/pkg/services/sqlstore -> ‘sqlstore.go’

### API Call

- …/public/app/core/services/echo/backends -> PerformanceBackend.ts’