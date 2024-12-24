import { css } from '@emotion/css';
import React, { useState } from 'react';

import { arrayUtils, AnnotationQuery } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { Button, DeleteButton, IconButton, useStyles2, VerticalGroup } from '@grafana/ui';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import { t, Trans } from 'app/core/internationalization';

import { DashboardModel } from '../../state/DashboardModel';
import { ListNewButton } from '../DashboardSettings/ListNewButton';

type Props = {
  dashboard: DashboardModel;
  onNew: () => void;
  onEdit: (idx: number) => void;
};

export const AnnotationSettingsList = ({ dashboard, onNew, onEdit }: Props) => {
  const styles = useStyles2(getStyles);
  const [annotations, updateAnnotations] = useState(dashboard.annotations.list);

  const onMove = (idx: number, direction: number) => {
    dashboard.annotations.list = arrayUtils.moveItemImmutably(annotations, idx, idx + direction);
    updateAnnotations(dashboard.annotations.list);
  };

  const onDelete = (idx: number) => {
    dashboard.annotations.list = [...annotations.slice(0, idx), ...annotations.slice(idx + 1)];
    updateAnnotations(dashboard.annotations.list);
  };

  const showEmptyListCTA = annotations.length === 0 || (annotations.length === 1 && annotations[0].builtIn);

  /*BMC Change: To enable localization for below text*/
  const annoNameBuilt = t('bmcgrafana.dashboards.settings.annotation.anno-name-builtin', '(Built-in)');
  const annoNameDisabled = t('bmcgrafana.dashboards.settings.annotation.anno-name-disabled', '(Disabled)');

  const getAnnotationName = (anno: AnnotationQuery) => {
    if (anno.enable === false) {
      return (
        <>
          {/*BMC Change: To enable localization for below text*/}
          <em className="muted">
            {annoNameDisabled} &nbsp; {anno.name}
          </em>
        </>
      );
    }

    if (anno.builtIn) {
      return (
        <>
          {/*BMC Change: To enable localization for below text*/}
          <em className="muted">
            {anno.name} &nbsp; {annoNameBuilt}
          </em>
        </>
      );
    }

    return <>{anno.name}</>;
  };

  const dataSourceSrv = getDataSourceSrv();
  return (
    <VerticalGroup>
      {annotations.length > 0 && (
        <div className={styles.table}>
          <table role="grid" className="filter-table filter-table--hover">
            <thead>
              <tr>
                {/*BMC Change: To enable localization for below text*/}
                <th>{t('bmcgrafana.dashboards.settings.annotation.query-name', 'Query name')}</th>
                <th>{t('bmcgrafana.dashboards.settings.annotation.data-source', 'Data source')}</th>
                <th colSpan={3}></th>
              </tr>
            </thead>
            <tbody>
              {dashboard.annotations.list.map((annotation, idx) => (
                <tr key={`${annotation.name}-${idx}`}>
                  {annotation.builtIn ? (
                    <td role="gridcell" style={{ width: '90%' }} className="pointer" onClick={() => onEdit(idx)}>
                      <Button size="sm" fill="text" variant="secondary">
                        {getAnnotationName(annotation)}
                      </Button>
                    </td>
                  ) : (
                    <td role="gridcell" className="pointer" onClick={() => onEdit(idx)}>
                      <Button size="sm" fill="text" variant="secondary">
                        {getAnnotationName(annotation)}
                      </Button>
                    </td>
                  )}
                  <td role="gridcell" className="pointer" onClick={() => onEdit(idx)}>
                    {dataSourceSrv.getInstanceSettings(annotation.datasource)?.name || annotation.datasource?.uid}
                  </td>
                  <td role="gridcell" style={{ width: '1%' }}>
                    {/*BMC Change: To enable localization for below text*/}
                    {idx !== 0 && (
                      <IconButton
                        name="arrow-up"
                        onClick={() => onMove(idx, -1)}
                        tooltip={t('bmcgrafana.dashboards.settings.annotation.move-up', 'Move up')}
                      />
                    )}
                  </td>
                  <td role="gridcell" style={{ width: '1%' }}>
                    {/*BMC Change: To enable localization for below text*/}
                    {dashboard.annotations.list.length > 1 && idx !== dashboard.annotations.list.length - 1 ? (
                      <IconButton
                        name="arrow-down"
                        onClick={() => onMove(idx, 1)}
                        tooltip={t('bmcgrafana.dashboards.settings.annotation.move-down', 'Move down')}
                      />
                    ) : null}
                  </td>
                  <td role="gridcell" style={{ width: '1%' }}>
                    {!annotation.builtIn && (
                      <DeleteButton
                        size="sm"
                        onConfirm={() => onDelete(idx)}
                        aria-label={`Delete query with title "${annotation.name}"`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/*BMC Change: To enable localization for below text*/}
      {showEmptyListCTA && (
        <EmptyListCTA
          onClick={onNew}
          title={t(
            'bmcgrafana.dashboards.settings.annotation.title',
            'There are no custom annotation queries added yet'
          )}
          buttonIcon="comment-alt"
          buttonTitle={t('bmcgrafana.dashboards.settings.annotation.button-title', 'Add annotation query')}
          infoBoxTitle={t('bmcgrafana.dashboards.settings.annotation.info-title', 'What are annotation queries?')}
          infoBox={{
            __html: `
            <p>${t(
              'bmcgrafana.dashboards.settings.annotation.info-body',
              `Annotations provide a way to integrate event data into your graphs. They are visualized as vertical lines
          and icons on all graph panels. When you hover over an annotation icon you can get event text &amp; tags for
          the event. You can add annotation events directly from grafana by holding CTRL or CMD + click on graph (or
          drag region). These will be stored in Grafana's annotation database.`
            )}
          </p>
          ${t(
            'bmcgrafana.dashboards.settings.annotation.info-body-doc-link',
            'Checkout the <0>Annotations documentation</0> for more information.'
          )
            .replace(
              '<0>',
              '<a class="external-link" target="_blank" href="http://docs.grafana.org/reference/annotations/">'
            )
            .replace('</0>', '</a>')}        
        `,
          }}
        />
      )}
      {!showEmptyListCTA && (
        <ListNewButton onClick={onNew}>
          <Trans i18nKey={'bmcgrafana.dashboards.settings.annotation.new-query-button'}>New query</Trans>
        </ListNewButton>
      )}
    </VerticalGroup>
  );
};

const getStyles = () => ({
  table: css`
    width: 100%;
    overflow-x: scroll;
  `,
});
