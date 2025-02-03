import { css } from '@emotion/css';
import { FormEvent, useState, useEffect } from 'react';
import { useAsync } from 'react-use';

import { DataSourceInstanceSettings, SelectableValue, TimeRange } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { getDataSourceSrv } from '@grafana/runtime';
import { QueryVariable } from '@grafana/scenes';
import { DataSourceRef, VariableRefresh, VariableSort } from '@grafana/schema';
import { Button, Field, InlineField, InlineFieldRow, InlineSwitch, Modal, useTheme2 } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';
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
    const [toggle, setToggle] = useState<boolean>(false);
    const [modalStatus, setModalStatus] = useState<boolean>(false);
    useEffect(() => {
      setToggle(query && typeof query !== 'string' ? true : false);
    }, []);
    return (
      <InlineFieldRow style={{ marginBottom: '10px', flexDirection: 'column' }}>
        <InlineField
          label={t('bmc.variables.query-editor.enable-editor', 'Enable query editor')}
          style={{ marginBottom: 0 }}
        >
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
          <Trans i18nKey="bmc.variables.query-editor.service-management-note">
            Note: Applicable only to the Service Management query type.
          </Trans>
        </span>
        <Modal
          isOpen={modalStatus}
          title={t('bmc.variables.query-editor.modal-close-title', 'Unsaved changes')}
          onDismiss={() => {
            setModalStatus(false);
          }}
          icon="exclamation-triangle"
          className={css`
            width: 500px;
          `}
          closeOnBackdropClick={false}
        >
          <h5>
            <Trans i18nKey="bmc.variables.query-editor.modal-close-confirmation">
              The current query will be lost. Do you want to continue?
            </Trans>
          </h5>
          <Modal.ButtonRow>
            <Button
              variant="secondary"
              onClick={() => {
                setModalStatus(false);
              }}
              fill="outline"
            >
              <Trans i18nKey="bmc.common.cancel">Cancel</Trans>
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
              <Trans i18nKey="bmc.variables.query-editor.continue">Continue</Trans>
            </Button>
          </Modal.ButtonRow>
        </Modal>
      </InlineFieldRow>
    );
  };
  // BMC Code Ends

  return (
    <>
      <VariableLegend>
        <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.query.query-options">Query options</Trans>
      </VariableLegend>
      <Field
        label={t('bmcgrafana.dashboards.settings.variables.editor.types.query.data-source', 'Data source')}
        htmlFor="data-source-picker"
      >
        <DataSourcePicker current={datasourceRef} onChange={onDataSourceChange} variables={true} width={30} />
      </Field>

      {/* BMC Code Starts */}
      {datasource?.type === bmcDefaultDs ? <RenderBMCHelixToggle /> : null}
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
          <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.types.query.regex-editor-text">
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
          </Trans>
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

      <VariableLegend>
        <Trans i18nKey="bmcgrafana.dashboards.settings.variables.editor.selection-options">Selection options</Trans>
      </VariableLegend>
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
