import React, { FC, memo } from 'react';
import { connect, MapStateToProps } from 'react-redux';

import { NavModel } from '@grafana/data';
import { Page } from 'app/core/components/Page/Page';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';

import { FieldsForm } from './FieldsForm';

interface ConnectedProps {
  navModel: NavModel;
  uid?: string;
  url: string;
  action: string;
}

export const CalculatedFieldsModify: FC<ConnectedProps> = memo(({ navModel, uid, action }) => {
  return (
    <Page navModel={navModel}>
      <Page.Contents isLoading={false}>
        <FieldsForm uid={uid} action={action} />
      </Page.Contents>
    </Page>
  );
});
CalculatedFieldsModify.displayName = 'CalculatedFieldsModify';

interface CalcFieldListProps extends GrafanaRouteComponentProps<{ uid?: string; action: string }> {}

const mapStateToProps: MapStateToProps<ConnectedProps, CalcFieldListProps, StoreState> = (state, props) => {
  return {
    navModel: getNavModel(state.navIndex, 'calc-fields'),
    url: props.match.url,
    uid: props.match.params.uid,
    action: props.match.params.action,
  };
};

export default connect(mapStateToProps)(CalculatedFieldsModify);
