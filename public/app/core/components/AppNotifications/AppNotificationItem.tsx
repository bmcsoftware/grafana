import React, { Component } from 'react';
import { AppNotification } from 'app/types';
import { Alert } from '@grafana/ui';

interface Props {
  appNotification: AppNotification;
  onClearNotification: (id: string) => void;
}

export default class AppNotificationItem extends Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    return this.props.appNotification.id !== nextProps.appNotification.id;
  }

  componentDidMount() {
    const { appNotification, onClearNotification } = this.props;
    // BMC Code: next line only, disabling auto close for Gainsight User level consent alert
    if (appNotification.timeout) {
      setTimeout(() => {
        onClearNotification(appNotification.id);
      }, appNotification.timeout);
    }
  }

  render() {
    const { appNotification, onClearNotification } = this.props;

    return (
      <Alert
        severity={appNotification.severity}
        title={appNotification.title}
        onRemove={() => onClearNotification(appNotification.id)}
        elevated
      >
        {appNotification.component || appNotification.text}
      </Alert>
    );
  }
}
