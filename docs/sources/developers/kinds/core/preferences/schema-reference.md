---
keywords:
  - grafana
  - schema
title: Preferences kind
---
> Both documentation generation and kinds schemas are in active development and subject to change without prior notice.

## Preferences

#### Maturity: [merged](../../../maturity/#merged)
#### Version: 0.0

The user or team frontend preferences

| Property            | Type                                              | Required | Default | Description                                                                     |
|---------------------|---------------------------------------------------|----------|---------|---------------------------------------------------------------------------------|
| `enabledQueryTypes` | [EnabledQueryTypes](#enabledquerytypes)           | No       |         |                                                                                 |
| `homeDashboardUID`  | string                                            | No       |         | UID for the home dashboard                                                      |
| `language`          | string                                            | No       |         | Selected language (beta)                                                        |
| `queryHistory`      | [QueryHistoryPreference](#queryhistorypreference) | No       |         |                                                                                 |
| `theme`             | string                                            | No       |         | light, dark, empty is default                                                   |
| `timeFormat`        | string                                            | No       |         | Format for dashboards, panels and reports timestamps                            |
| `timezone`          | string                                            | No       |         | The timezone selection<br/>TODO: this should use the timezone defined in common |
| `weekStart`         | string                                            | No       |         | day of the week (sunday, monday, etc)                                           |

### EnabledQueryTypes

| Property        | Type     | Required | Default | Description |
|-----------------|----------|----------|---------|-------------|
| `applyForAdmin` | boolean  | No       |         |             |
| `enabledTypes`  | string[] | No       |         |             |

### QueryHistoryPreference

| Property  | Type   | Required | Default | Description                                 |
|-----------|--------|----------|---------|---------------------------------------------|
| `homeTab` | string | No       |         | one of: '' &#124; 'query' &#124; 'starred'; |


