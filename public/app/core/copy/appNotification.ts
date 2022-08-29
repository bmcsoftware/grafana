import { AppNotification, AppNotificationSeverity, AppNotificationTimeout } from 'app/types';
import { getMessageFromError } from 'app/core/utils/errors';
import { v4 as uuidv4 } from 'uuid';

const defaultSuccessNotification = {
  title: '',
  text: '',
  severity: AppNotificationSeverity.Success,
  icon: 'check',
  timeout: AppNotificationTimeout.Success,
};

const defaultWarningNotification = {
  title: '',
  text: '',
  severity: AppNotificationSeverity.Warning,
  icon: 'exclamation-triangle',
  timeout: AppNotificationTimeout.Warning,
};

const defaultErrorNotification = {
  title: '',
  text: '',
  severity: AppNotificationSeverity.Error,
  icon: 'exclamation-triangle',
  timeout: AppNotificationTimeout.Error,
};

// BMC Code
const defaultInfoNotification = {
  title: '',
  text: '',
  severity: AppNotificationSeverity.Info,
  icon: 'exclamation-triangle',
  timeout: AppNotificationTimeout.Info,
};
// BMC Code ends

export const createSuccessNotification = (title: string, text = ''): AppNotification => ({
  ...defaultSuccessNotification,
  title: title,
  text: text,
  id: uuidv4(),
});

export const createErrorNotification = (
  title: string,
  text: string | Error = '',
  component?: React.ReactElement
): AppNotification => {
  return {
    ...defaultErrorNotification,
    text: getMessageFromError(text),
    title,
    id: uuidv4(),
    component,
  };
};

export const createWarningNotification = (title: string, text = ''): AppNotification => ({
  ...defaultWarningNotification,
  title: title,
  text: text,
  id: uuidv4(),
});

// BMC Code
export const createInfoNotification = (title: string, text = '', component: React.ReactElement): AppNotification => ({
  ...defaultInfoNotification,
  title: title,
  text: text,
  component: component,
  id: uuidv4(),
});
// BMC Code ends
