import * as React from 'react';

import { Collapse, Form, Label, Icon } from '@grafana/ui';
import { ImportDashboardForm } from 'app/features/manage-dashboards/components/ImportDashboardForm';

import { ImportDashboardDTO } from '../state/reducers';

export const DashboardsOverview: React.FC<any> = ({ importOperations }) => {
  const [accordionIndex, setAccIndex] = React.useState<number>(0);
  const dashboardsKey = React.useMemo(() => {
    return Object.keys(importOperations.store.dashboards);
  }, [importOperations]);
  const setUpdatedDashboard = React.useMemo(() => {
    return (dashId: string, dashIndex: number, form: ImportDashboardDTO) => {
      if (dashboardsKey.length - 1 >= dashIndex + 1) {
        setAccIndex(dashIndex + 1);
      } else {
        setAccIndex(-1);
      }
      importOperations.updateDashboard(dashId, form);
    };
  }, [dashboardsKey, importOperations]);
  return (
    <div>
      {dashboardsKey.length > 0 ? (
        dashboardsKey.map((dash, index) => {
          return importOperations.store.dashboards[dash] ? (
            <Collapse
              collapsible={true}
              isOpen={index === accordionIndex}
              key={`${dash}-${index}`}
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <>{importOperations.store.dashboards[dash].dashId}</>
                  {importOperations.store.dashboards[dash].checked ? (
                    <Icon name="check-circle" style={{ color: 'green', marginLeft: '10px' }} />
                  ) : null}
                </div>
              }
              onToggle={(isOpen) => {
                isOpen ? setAccIndex(index) : setAccIndex(-1);
              }}
            >
              <ImportDashboardOverview
                dashboard={importOperations.store.dashboards[dash]}
                updateDashboard={setUpdatedDashboard}
                clearDashboardById={(dashId: string) => {
                  importOperations.clearLoadedDashboard(dashId);
                }}
                index={index}
              />
            </Collapse>
          ) : null;
        })
      ) : (
        <>
          <Label>No Dashboards Imported</Label>
        </>
      )}
    </div>
  );
};

const ImportDashboardOverview: React.FC<any> = ({ dashboard, updateDashboard, index, clearDashboardById }) => {
  const [uidReset, setUidReset] = React.useState<boolean>(false);
  const onSubmit = React.useMemo(() => {
    return (form: ImportDashboardDTO) => {
      updateDashboard(dashboard.dashId, index, form);
    };
  }, [dashboard.dashId, index, updateDashboard]);
  const onCancel = React.useMemo(() => {
    return () => {
      clearDashboardById(dashboard.dashId);
    };
  }, [clearDashboardById, dashboard.dashId]);
  const onUidReset = React.useMemo(() => {
    return () => {
      setUidReset(true);
    };
  }, [setUidReset]);
  const { dashboard: dash, inputs = {}, inputsToPersist = [], folderId } = dashboard;
  const dataSources: any[] = [];
  if (inputs.dataSources?.length > 0 && inputsToPersist.length > 0) {
    inputs.dataSources.forEach((item: any) => {
      const persistedInput = inputsToPersist.find((i: any) => i.type === item.type && i.pluginId && item.pluginId);
      if (persistedInput) {
        dataSources.push({ name: persistedInput.name, type: persistedInput.type, uid: persistedInput.value });
      } else {
        dataSources.push(undefined);
      }
    });
  }
  const constants: any[] = [];
  if (inputs.constants?.length > 0 && inputsToPersist.length > 0) {
    inputs.constants.forEach((item: any) => {
      const persistedInput = inputsToPersist.find((i: any) => i.type === item.type && i.name && item.name);
      if (persistedInput) {
        dataSources.push(persistedInput.value);
      } else {
        dataSources.push(undefined);
      }
    });
  }
  return (
    <>
      <Form
        style={{ paddingLeft: '10px' }}
        onSubmit={onSubmit}
        defaultValues={{
          ...dash,
          constants: constants,
          dataSources: dataSources,
          elements: [],
          folder: { id: folderId ?? 0 },
        }}
        validateOnMount
        validateFieldsOnMount={['title', 'uid']}
        validateOn="onChange"
      >
        {({ register, errors, control, watch, getValues }) => (
          <ImportDashboardForm
            register={register}
            errors={errors}
            control={control}
            getValues={getValues}
            uidReset={uidReset}
            inputs={inputs}
            onCancel={onCancel}
            onUidReset={onUidReset}
            onSubmit={onSubmit}
            watch={watch}
            initialFolderId={folderId ?? 0}
            isMultiple={true}
            inputsToPersist={inputsToPersist ?? []}
          />
        )}
      </Form>
    </>
  );
};
