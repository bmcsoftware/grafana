import React, { useEffect, useState } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { getBackendSrv } from '@grafana/runtime';
import { ExpressionDatasourceRef } from '@grafana/runtime/src/utils/DataSourceWithBackend';
import {
  Button,
  Field,
  FormAPI,
  FormFieldErrors,
  FormsOnSubmit,
  HorizontalGroup,
  Input,
  InputControl,
  Legend,
  Select,
  Alert,
  VerticalGroup,
} from '@grafana/ui';
import { OldFolderPicker } from 'app/core/components/Select/OldFolderPicker';
import { DataSourcePicker } from 'app/features/datasources/components/picker/DataSourcePicker';

import {
  DashboardInput,
  DashboardInputs,
  DataSourceInput,
  ImportDashboardDTO,
  LibraryPanelInputState,
  ViewInput,
} from '../state/reducers';
import { validateTitle, validateUid } from '../utils/validation';

import { ImportDashboardLibraryPanelsList } from './ImportDashboardLibraryPanelsList';

interface Props extends Pick<FormAPI<ImportDashboardDTO>, 'register' | 'errors' | 'control' | 'getValues' | 'watch'> {
  uidReset: boolean;
  inputs: DashboardInputs;
  initialFolderUid: string;

  onCancel: () => void;
  onUidReset: () => void;
  onSubmit: FormsOnSubmit<ImportDashboardDTO>;
  // BMC Code: Next line
  isMultiple?: boolean;
  inputsToPersist?: any[];
  panels?: any[];
}
// BMC code: start
type ViewListItem = { label: string; value: number };
type ViewListType = { id: number; itsmCompVersion: string; name: string; deleted: boolean };
type SelectedViewType = Record<number, ViewListItem | string>;
// BMC code: end

export const ImportDashboardForm = ({
  register,
  errors,
  control,
  getValues,
  uidReset,
  inputs,
  initialFolderUid,
  onUidReset,
  onCancel,
  onSubmit,
  watch,
  // BMC Code: Next 2 line
  isMultiple,
  inputsToPersist,
  panels,
}: Props) => {
  const [isSubmitted, setSubmitted] = useState(false);
  // BMC Code: Next line
  const [viewList, setViewList] = useState<ViewListItem[]>([]);
  const [selectedView, setSelectedView] = useState<SelectedViewType>({});
  const watchDataSources = watch('dataSources');
  const watchFolder = watch('folder');
  const [warningVQBMessage, setWarningVQBMessage] = useState(false);

  /*
    This useEffect is needed for overwriting a dashboard. It
    submits the form even if there's validation errors on title or uid.
  */
  useEffect(() => {
    if (isSubmitted && (errors.title || errors.uid)) {
      onSubmit(getValues());
    }
  }, [errors, getValues, isSubmitted, onSubmit]);

  // BMC Code: start
  useEffect(() => {
    // Function to fetch data from the API
    const getViewList = async () => {
      const data: ViewListType[] = await getBackendSrv().get('/api/rmsmetadata/view/list');
      setViewList(
        Array.isArray(data) ? data.filter((i) => !i.deleted).map((item) => ({ label: item.name, value: item.id })) : []
      );
    };
    // Only make the API call if the condition is true
    if (viewList.length === 0 && inputs?.vqbViews?.length) {
      getViewList();
    }
  }, [inputs?.vqbViews?.length, viewList.length]);

  useEffect(() => {
    if (viewList.length) {
      const selectionObject: SelectedViewType = {};
      inputs?.vqbViews?.forEach((input) => {
        selectionObject[input.id] = viewList.find((list) => list.label === input.label) || '';
      });
      setSelectedView(selectionObject);
    }
  }, [viewList]);
  // BMC Code: end

  const newLibraryPanels = inputs?.libraryPanels?.filter((i) => i.state === LibraryPanelInputState.New) ?? [];
  const existingLibraryPanels = inputs?.libraryPanels?.filter((i) => i.state === LibraryPanelInputState.Exists) ?? [];

  // BMC Code: start
  useEffect(() => {
    if (inputs && inputs?.vqbViews?.length === 0 && panels && panels.length > 0) {
      const panelFound = panels.some(
        (panel) =>
          panel.targets &&
          panel.targets.some(
            (target: { sourceQuery: { queryType: string } }) => target?.sourceQuery?.queryType === 'Views'
          )
      );
      panelFound && setWarningVQBMessage(true);
    }
    return () => {
      setWarningVQBMessage(false);
    };
  }, [panels, inputs]);
  // BMC Code: end

  return (
    <>
      {/* BMC Code: Next line */}
      {warningVQBMessage && (
        <Alert title={'VQB Panel import'} severity={'warning'} onRemove={(e) => setWarningVQBMessage(false)} elevated>
          <VerticalGroup>
            <div>
              The import has a visual query builder panel. Please re-export it from the desired environment, or manual
              intervention will be required for view selection.
            </div>
          </VerticalGroup>
        </Alert>
      )}
      {!isMultiple ? <Legend>Options</Legend> : null}
      <Field label="Name" invalid={!!errors.title} error={errors.title && errors.title.message}>
        <Input
          {...register('title', {
            required: 'Name is required',
            validate: async (v: string) => await validateTitle(v, getValues().folder.uid),
          })}
          type="text"
          data-testid={selectors.components.ImportDashboardForm.name}
        />
      </Field>
      <Field label="Folder">
        <InputControl
          render={({ field: { ref, ...field } }) => (
            <OldFolderPicker {...field} enableCreateNew initialFolderUid={initialFolderUid} />
          )}
          name="folder"
          control={control}
        />
      </Field>
      <Field
        label="Unique identifier (UID)"
        description="The unique identifier (UID) of a dashboard can be used for uniquely identify a dashboard between multiple Grafana installs.
                The UID allows having consistent URLs for accessing dashboards so changing the title of a dashboard will not break any
                bookmarked links to that dashboard."
        invalid={!!errors.uid}
        error={errors.uid && errors.uid.message}
      >
        <>
          {!uidReset ? (
            <Input
              disabled
              {...register('uid', { validate: async (v: string) => await validateUid(v) })}
              addonAfter={!uidReset && <Button onClick={onUidReset}>Change uid</Button>}
            />
          ) : (
            <Input {...register('uid', { required: true, validate: async (v: string) => await validateUid(v) })} />
          )}
        </>
      </Field>
      {inputs.dataSources &&
        inputs.dataSources.map((input: DataSourceInput, index: number) => {
          if (input.pluginId === ExpressionDatasourceRef.type) {
            return null;
          }
          const dataSourceOption = `dataSources.${index}` as const;
          const current = watchDataSources ?? [];
          // BMC Code : Next block
          const currDs = inputsToPersist?.find((item: any) => {
            return item.pluginId === input.pluginId && item.type === input.type;
          });
          return (
            <Field
              label={input.label}
              description={input.description}
              key={dataSourceOption}
              invalid={errors.dataSources && !!errors.dataSources[index]}
              error={errors.dataSources && errors.dataSources[index] && 'A data source is required'}
            >
              <InputControl
                name={dataSourceOption}
                render={({ field: { ref, ...field } }) => (
                  <DataSourcePicker
                    {...field}
                    noDefault={true}
                    placeholder={input.info}
                    pluginId={input.pluginId}
                    // BMC Code: Inline
                    current={current[index]?.uid ?? currDs?.value}
                  />
                )}
                control={control}
                rules={{ required: true }}
              />
            </Field>
          );
        })}
      {/* BMC Code: Next line */}
      {inputs.vqbViews &&
        inputs.vqbViews.map((input: ViewInput, index: number) => {
          const fieldView = `vqbViews.${index}` as const;
          return (
            <Field
              label={`View: ${index + 1}`}
              description={input.description}
              key={fieldView}
              invalid={errors.vqbViews && !!errors.vqbViews[index]}
              error={errors.vqbViews && errors.vqbViews[index] && 'A view selection is required'}
            >
              <InputControl
                name={fieldView}
                render={({ field: { ref, ...field } }) => (
                  <Select
                    id="view-list"
                    {...field}
                    onChange={(val: any) => {
                      const selectedNewView = {
                        id: Number(input.id),
                        ...val,
                      };
                      field.onChange(selectedNewView);
                      setSelectedView((prevState: any) => {
                        return {
                          ...prevState,
                          [input.id]: val,
                        };
                      });
                      return;
                    }}
                    value={(selectedView as Record<number, ViewListItem>)[input.id]}
                    options={viewList}
                    placeholder={'Select view'}
                  />
                )}
                control={control}
                rules={{ required: true }}
              />
            </Field>
          );
        })}
      {inputs.constants &&
        inputs.constants.map((input: DashboardInput, index) => {
          const constantIndex = `constants.${index}` as const;
          // BMC Code : Next block
          const currConst =
            isMultiple &&
            inputsToPersist?.find((item: any) => {
              return item.name === input.name && item.type === input.type;
            });
          return (
            <Field
              label={input.label}
              error={errors.constants && errors.constants[index] && `${input.label} needs a value`}
              invalid={errors.constants && !!errors.constants[index]}
              key={constantIndex}
            >
              <Input
                {...register(constantIndex, { required: true })}
                // BMC Code: Inline
                defaultValue={currConst?.value ?? input.value}
              />
            </Field>
          );
        })}
      <ImportDashboardLibraryPanelsList
        inputs={newLibraryPanels}
        label="New library panels"
        description="List of new library panels that will get imported."
        folderName={watchFolder.title}
      />
      <ImportDashboardLibraryPanelsList
        inputs={existingLibraryPanels}
        label="Existing library panels"
        description="List of existing library panels. These panels are not affected by the import."
        folderName={watchFolder.title}
      />
      <HorizontalGroup>
        <Button
          type="submit"
          data-testid={selectors.components.ImportDashboardForm.submit}
          variant={getButtonVariant(errors)}
          onClick={() => {
            setSubmitted(true);
          }}
        >
          {getButtonText(errors, isMultiple)}
        </Button>
        <Button type="reset" variant="secondary" onClick={onCancel}>
          {/* BMC Code: Next line */}
          {isMultiple ? 'Delete' : 'Cancel'}
        </Button>
      </HorizontalGroup>
    </>
  );
};

function getButtonVariant(errors: FormFieldErrors<ImportDashboardDTO>) {
  return errors && (errors.title || errors.uid) ? 'destructive' : 'primary';
}

// BMC Code: Inline function
function getButtonText(errors: FormFieldErrors<ImportDashboardDTO>, isMultiple?: boolean) {
  return errors && (errors.title || errors.uid)
    ? `${!isMultiple ? 'Import' : 'Save'} (Overwrite)`
    : `${!isMultiple ? 'Import' : 'Save'}`;
}
