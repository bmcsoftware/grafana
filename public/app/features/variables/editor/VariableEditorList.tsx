import { css } from '@emotion/css';
import React, { ReactElement } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';

import { TypedVariableModel } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { reportInteraction } from '@grafana/runtime';
import { Button, useStyles2, Stack } from '@grafana/ui';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import { t, Trans } from 'app/core/internationalization';

import { VariablesDependenciesButton } from '../inspect/VariablesDependenciesButton';
import { UsagesToNetwork, VariableUsageTree } from '../inspect/utils';
import { KeyedVariableIdentifier } from '../state/types';

import { VariableEditorListRow } from './VariableEditorListRow';

export interface Props {
  variables: TypedVariableModel[];
  usages: VariableUsageTree[];
  usagesNetwork: UsagesToNetwork[];
  onAdd: () => void;
  onEdit: (identifier: KeyedVariableIdentifier) => void;
  onChangeOrder: (identifier: KeyedVariableIdentifier, fromIndex: number, toIndex: number) => void;
  onDuplicate: (identifier: KeyedVariableIdentifier) => void;
  onDelete: (identifier: KeyedVariableIdentifier) => void;
}

export function VariableEditorList({
  variables,
  usages,
  usagesNetwork,
  onChangeOrder,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
}: Props): ReactElement {
  const styles = useStyles2(getStyles);
  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !result.source) {
      return;
    }
    reportInteraction('Variable drag and drop');
    const identifier = JSON.parse(result.draggableId);
    onChangeOrder(identifier, variables[result.source.index].index, variables[result.destination.index].index);
  };

  return (
    <div>
      <div>
        {variables.length === 0 && <EmptyVariablesList onAdd={onAdd} />}

        {variables.length > 0 && (
          <Stack direction="column" gap={4}>
            <div className={styles.tableContainer}>
              <table
                className="filter-table filter-table--hover"
                aria-label={selectors.pages.Dashboard.Settings.Variables.List.table}
                role="grid"
              >
                {/* BMC Change: To enable localization for below text */}
                <thead>
                  <tr>
                    <th>
                      <Trans i18nKey="bmcgrafana.dashboards.settings.variables.variables-tab.variable-editor-list.variable">
                        Variable
                      </Trans>
                    </th>
                    <th>
                      <Trans i18nKey="bmcgrafana.dashboards.settings.variables.variables-tab.variable-editor-list.definition">
                        Definition
                      </Trans>
                    </th>
                    <th colSpan={5} />
                  </tr>
                </thead>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="variables-list" direction="vertical">
                    {(provided) => (
                      <tbody ref={provided.innerRef} {...provided.droppableProps}>
                        {variables.map((variable, index) => (
                          <VariableEditorListRow
                            index={index}
                            key={`${variable.name}-${index}`}
                            variable={variable}
                            usageTree={usages}
                            usagesNetwork={usagesNetwork}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                            onEdit={onEdit}
                          />
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </table>
            </div>
            <Stack>
              <VariablesDependenciesButton variables={variables} />
              <Button
                aria-label={selectors.pages.Dashboard.Settings.Variables.List.newButton}
                onClick={onAdd}
                icon="plus"
              >
                <Trans i18nKey="bmcgrafana.dashboards.settings.variables.variables-tab.variable-editor-list.button-text">
                  New variable
                </Trans>
              </Button>
            </Stack>
          </Stack>
        )}
      </div>
    </div>
  );
}

function EmptyVariablesList({ onAdd }: { onAdd: () => void }): ReactElement {
  return (
    <div>
      <EmptyListCTA
        title={t('bmcgrafana.dashboards.settings.variables.empty-list', 'There are no variables yet')}
        buttonIcon="calculator-alt"
        buttonTitle={t('bmcgrafana.dashboards.settings.variables.variables-tab.button-title', 'Add variable')}
        infoBox={{
          __html: `<p>${t(
            'bmcgrafana.dashboards.settings.variables.info-body',
            'Variables enable more interactive and dynamic dashboards. Instead of hard-coding things like server or sensor names in your metric queries you can use variables in their place. Variables are shown as list boxes at the top of the dashboard. These drop-down lists make it easy to change the data being displayed in your dashboard. Check out the <0>Templates and variables documentation</0> for more information.'
          )
            .replace(
              '<0>',
              '<a class="external-link" href="https://grafana.com/docs/grafana/latest/variables/" target="_blank">'
            )
            .replace('</0>', '</a>')}</p>`,
        }}
        infoBoxTitle={t(
          'bmcgrafana.dashboards.settings.variables.variables-tab.info-box-title',
          'What do variables do?'
        )}
        onClick={(event) => {
          event.preventDefault();
          onAdd();
        }}
      />
    </div>
  );
}

const getStyles = () => ({
  tableContainer: css`
    overflow: scroll;
    width: 100%;
  `,
});
