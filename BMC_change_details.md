# **_Change details in Grafana v9.5.1_**

# **_Rebranding:_**

#### Theme, Logo, and App name

- …/public/img -> ‘apple-touch-icon.png’, ‘fav32.png’, ‘grafana_com_auth_icon.svg’, ‘grafana_mask_icon_white.svg’, ‘grafana_mask_icon.svg’, ‘grafana_icon.svg’
- …/public/views -> ‘index-template.html’
- …/public/app/core/components/Branding -> ‘Branding.tsx’
- …/public/dashboards -> ‘default.json’
- …/public/app/plugins/panel/welcome -> ‘Welcome.tsx’
- …/public/app/features/datasources/state -> ‘buildCategories.ts’
- …/packages/grafana-ui/src/components/InfoBox -> ‘InfoBox.story.tsx’
- …/packages/grafana-ui/src/components/DataSourceSettings -> ‘DataSourceHttpSettings.tsx’, ‘TLSAuthSettings.tsx’
- …/packages/grafana-ui/src/components/DateTimePickers -> ‘TimeRangePicker.tsx’
- …/packages/grafana-ui/src/components/DateTimePickers/TimeRangePicker -> ‘TimePickerContent.tsx’
- …/pkg/api -> ‘index.go’
- …/public/sass/base -> ‘\_icons.scss’
- …/public/sass/components -> '\_panel_header.scss'

#### Error Pages

- …/public/views -> 'index-template.html'
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

- …/public/app/features/dashboard/components/DashNav -> ‘DashNav.tsx’
- …/public/app/features/dashboard/components/DashboardLoading -> ‘DashboardLoading.tsx’
- …/public/app/features/dashboard/dashgrid/PanelHeader -> ‘PanelHeaderCorner.tsx’, ‘PanelHeaderMenu.tsx’, ‘PanelHeaderMenuItem.tsx’
- …/public/app/features/panel/components -> PanelDataErrorView.tsx’
- …/public/app/plugins/panel/graph -> ‘graph.ts’

### Disabled all the routes except dashboard

- …/public/app/routes -> ‘routes.tsx’

### Hide application left navigation

- …/public/app -> ‘AppWrapper.tsx’

# **_Hide/Disable Features from Grafana UI:_**

### Graph Legend Customization - to remove double quote from names

- …/public/app/plugins/panel/graph/Legend -> ‘LegendSeriesItem.tsx’

### Add user with viewer role

- …/pkg/services/sqlstore -> ‘sqlstore.go’
