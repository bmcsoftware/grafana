import { css } from '@emotion/css';
import React, { FormEvent } from 'react';
import { useAsync } from 'react-use';

import { DataSourceInstanceSettings, SelectableValue, TimeRange } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { getDataSourceSrv } from '@grafana/runtime';
import { QueryVariable } from '@grafana/scenes';
import { DataSourceRef, VariableRefresh, VariableSort } from '@grafana/schema';
import { Field, useTheme2, InlineFieldRow, InlineField, InlineSwitch, Modal, Button } from '@grafana/ui';
import { getGrafanaFeatureStatus } from 'app/features/dashboard/services/featureFlagSrv';
import { QueryEditor } from 'app/features/dashboard-scene/settings/variables/components/QueryEditor';
import { SelectionOptionsForm } from 'app/features/dashboard-scene/settings/variables/components/SelectionOptionsForm';
import { DataSourcePicker } from 'app/features/datasources/components/picker/DataSourcePicker';
import { getVariableQueryEditor } from 'app/features/variables/editor/getVariableQueryEditor';
import { QueryVariableRefreshSelect } from 'app/features/variables/query/QueryVariableRefreshSelect';
import { QueryVariableSortSelect } from 'app/features/variables/query/QueryVariableSortSelect';

import { VariableLegend } from './VariableLegend';
import { VariableTextAreaField } from './VariableTextAreaField';

type VariableQueryType = QueryVariable['state']['query'];

// BMC Code start
const bmcDefaultDs = 'bmchelix-ade-datasource';
// BMC Code end

interface QueryVariableEditorFormProps {
  datasource?: DataSourceRef;
  onDataSourceChange: (dsSettings: DataSourceInstanceSettings) => void;
  query: VariableQueryType;
  onQueryChange: (query: VariableQueryType) => void;
  onLegacyQueryChange: (query: VariableQueryType, definition: string) => void;
  timeRange: TimeRange;
  regex: string | null;
  onRegExChange: (event: FormEvent<HTMLTextAreaElement>) => void;
  sort: VariableSort;
  onSortChange: (option: SelectableValue<VariableSort>) => void;
  refresh: VariableRefresh;
  onRefreshChange: (option: VariableRefresh) => void;
  isMulti: boolean;
  onMultiChange: (event: FormEvent<HTMLInputElement>) => void;
  includeAll: boolean;
  onIncludeAllChange: (event: FormEvent<HTMLInputElement>) => void;
  allValue: string;
  onAllValueChange: (event: FormEvent<HTMLInputElement>) => void;
  // BMC Code: Below all props
  onIncludeOnlyAvailable?: (event: FormEvent<HTMLInputElement>) => void;
  discardForAll?: boolean;
}

export function QueryVariableEditorForm({
  datasource: datasourceRef,
  onDataSourceChange,
  query,
  onQueryChange,
  onLegacyQueryChange,
  timeRange,
  regex,
  onRegExChange,
  sort,
  onSortChange,
  refresh,
  onRefreshChange,
  isMulti,
  onMultiChange,
  includeAll,
  onIncludeAllChange,
  allValue,
  onAllValueChange,
  // BMC Code: Below all props
  onIncludeOnlyAvailable,
  discardForAll,
}: QueryVariableEditorFormProps) {
  const { value: dsConfig } = useAsync(async () => {
    const datasource = await getDataSourceSrv().get(datasourceRef ?? '');
    const VariableQueryEditor = await getVariableQueryEditor(datasource);

    return { datasource, VariableQueryEditor };
  }, [datasourceRef]);
  const { datasource, VariableQueryEditor } = dsConfig ?? {};

  // BMC Code Starts
  const RenderBMCHelixToggle = () => {
    const theme = useTheme2();
    const [toggle, setToggle] = React.useState<boolean>(false);
    const [modalStatus, setModalStatus] = React.useState<boolean>(false);
    React.useEffect(() => {
      setToggle(query && typeof query !== 'string' ? true : false);
    }, []);
    return (
      <InlineFieldRow style={{ marginBottom: '10px', flexDirection: 'column' }}>
        <InlineField label="Enable query editor" style={{ marginBottom: 0 }}>
          <InlineSwitch
            value={toggle}
            onChange={(e: any) => {
              setModalStatus(true);
            }}
          />
        </InlineField>
        <span
          className={css`
            font-size: ${theme.typography.size.xs};
            font-style: italic;
          `}
        >
          Note: Applicable only to the Service Management query type.
        </span>
        <Modal
          isOpen={modalStatus}
          title="Unsaved changes"
          onDismiss={() => {
            setModalStatus(false);
          }}
          icon="exclamation-triangle"
          className={css`
            width: 500px;
          `}
          closeOnBackdropClick={false}
        >
          <h5>The current query will be lost. Do you want to continue?</h5>
          <Modal.ButtonRow>
            <Button
              variant="secondary"
              onClick={() => {
                setModalStatus(false);
              }}
              fill="outline"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const newToggleState = !toggle;
                newToggleState
                  ? onLegacyQueryChange((datasource as any)?.variableDefaultQuery ?? {}, 'Open editor to see')
                  : onQueryChange('');
                setToggle(newToggleState);
                setModalStatus(false);
              }}
            >
              Continue
            </Button>
          </Modal.ButtonRow>
        </Modal>
      </InlineFieldRow>
    );
  };
  // BMC Code Ends

  return (
    <>
      <VariableLegend>Query options</VariableLegend>
      <Field label="Data source" htmlFor="data-source-picker">
        <DataSourcePicker current={datasourceRef} onChange={onDataSourceChange} variables={true} width={30} />
      </Field>

      {/* BMC Code Starts */}
      {datasource?.type === bmcDefaultDs && getGrafanaFeatureStatus('Visual Query Builder') ? (
        <RenderBMCHelixToggle />
      ) : null}
      {/* BMC Code Ends */}

      {datasource && VariableQueryEditor && (
        <QueryEditor
          onQueryChange={onQueryChange}
          onLegacyQueryChange={onLegacyQueryChange}
          datasource={datasource}
          query={query}
          VariableQueryEditor={VariableQueryEditor}
          timeRange={timeRange}
        />
      )}

      <VariableTextAreaField
        defaultValue={regex ?? ''}
        name="Regex"
        description={
          <div>
            Optional, if you want to extract part of a series name or metric node segment.
            <br />
            Named capture groups can be used to separate the display text and value (
            <a
              className="external-link"
              href="https://grafana.com/docs/grafana/latest/variables/filter-variables-with-regex#filter-and-modify-using-named-text-and-value-capture-groups"
              target="__blank"
            >
              see examples
            </a>
            ).
          </div>
        }
        placeholder="/.*-(?<text>.*)-(?<value>.*)-.*/"
        onBlur={onRegExChange}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.QueryVariable.queryOptionsRegExInputV2}
        width={52}
      />

      <QueryVariableSortSelect
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.QueryVariable.queryOptionsSortSelectV2}
        onChange={onSortChange}
        sort={sort}
      />

      <QueryVariableRefreshSelect
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.QueryVariable.queryOptionsRefreshSelectV2}
        onChange={onRefreshChange}
        refresh={refresh}
      />

      <VariableLegend>Selection options</VariableLegend>
      <SelectionOptionsForm
        multi={!!isMulti}
        includeAll={!!includeAll}
        allValue={allValue}
        onMultiChange={onMultiChange}
        onIncludeAllChange={onIncludeAllChange}
        onAllValueChange={onAllValueChange}
        // BMC Code: Below all Props
        query={query}
        onIncludeOnlyAvailable={onIncludeOnlyAvailable}
        discardForAll={discardForAll}
      />
    </>
  );
}
