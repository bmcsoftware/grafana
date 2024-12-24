import { css } from '@emotion/css';
import moment, { Moment } from 'moment/moment';
import React, { useMemo, useState } from 'react';

import { getTimeZoneInfo, GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Button, Field, FieldSet, HorizontalGroup, Select, TimeZonePicker, useStyles2 } from '@grafana/ui';
import { TimeZoneOffset } from '@grafana/ui/src/components/DateTimePickers/TimeZonePicker/TimeZoneOffset';
import { TimeZoneTitle } from '@grafana/ui/src/components/DateTimePickers/TimeZonePicker/TimeZoneTitle';
import { t, Trans } from 'app/core/internationalization';
import { TimeRegionConfig } from 'app/core/utils/timeRegions';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';

import { TimePickerInput } from './TimePickerInput';

interface Props {
  value: TimeRegionConfig;
  onChange: (value?: TimeRegionConfig) => void;
}

/*BMC Change: To enable localization for below text*/
const daysNameTranslated = () => {
  return [
    t('bmcgrafana.grafana-ui.weekdays.monday', 'Monday'),
    t('bmcgrafana.grafana-ui.weekdays.tuesday', 'Tuesday'),
    t('bmcgrafana.grafana-ui.weekdays.wednesday', 'Wednesday'),
    t('bmcgrafana.grafana-ui.weekdays.thursday', 'Thursday'),
    t('bmcgrafana.grafana-ui.weekdays.friday', 'Friday'),
    t('bmcgrafana.grafana-ui.weekdays.saturday', 'Saturday'),
    t('bmcgrafana.grafana-ui.weekdays.sunday', 'Sunday'),
  ];
};
const days = () => {
  return daysNameTranslated().map((v, idx) => {
    return {
      label: v,
      value: idx + 1,
    };
  });
};
export const TimeRegionEditor = ({ value, onChange }: Props) => {
  const styles = useStyles2(getStyles);
  const timestamp = Date.now();
  const timezoneInfo = getTimeZoneInfo(value.timezone ?? 'utc', timestamp);
  const isDashboardTimezone = getDashboardSrv().getCurrent()?.getTimezone() === value.timezone;

  /*BMC Change: To enable localization for below text*/
  const daysList = useMemo(days, []);

  const [isEditing, setEditing] = useState(false);

  const onToggleChangeTimezone = () => {
    setEditing(!isEditing);
  };

  const getTime = (time: string | undefined): Moment | undefined => {
    if (!time) {
      return undefined;
    }

    const date = moment();

    if (time) {
      const match = time.split(':');
      date.set('hour', parseInt(match[0], 10));
      date.set('minute', parseInt(match[1], 10));
    }

    return date;
  };

  const getToPlaceholder = () => {
    let placeholder = 'Everyday';
    if (value.fromDayOfWeek && !value.toDayOfWeek) {
      placeholder = daysList[value.fromDayOfWeek - 1].label;
    }

    return placeholder;
  };

  const renderTimezonePicker = () => {
    const timezone = (
      <>
        <TimeZoneTitle title={timezoneInfo?.name} />
        <TimeZoneOffset timeZone={value.timezone} timestamp={timestamp} />
      </>
    );
    /*BMC Change: To enable localization for below text*/
    if (isDashboardTimezone) {
      return (
        <>
          <Trans i18nKey={'bmcgrafana.time-region-editor.dashboard-timezone'}>Dashboard timezone</Trans> ({timezone})
        </>
      );
    }

    return timezone;
  };

  const onTimeChange = (v: Moment, field: string) => {
    const time = v ? v.format('HH:mm') : undefined;
    if (field === 'from') {
      onChange({ ...value, from: time });
    } else {
      onChange({ ...value, to: time });
    }
  };

  const onTimezoneChange = (v: string | undefined) => {
    onChange({ ...value, timezone: v });
  };

  const onFromDayOfWeekChange = (v: SelectableValue<number>) => {
    const fromDayOfWeek = v ? v.value : undefined;
    const toDayOfWeek = v ? value.toDayOfWeek : undefined; // clear if everyday
    onChange({ ...value, fromDayOfWeek, toDayOfWeek });
  };

  const onToDayOfWeekChange = (v: SelectableValue<number>) => {
    onChange({ ...value, toDayOfWeek: v ? v.value : undefined });
  };

  const renderTimezone = () => {
    if (isEditing) {
      return (
        <TimeZonePicker
          value={value.timezone}
          includeInternal={true}
          onChange={(v) => onTimezoneChange(v)}
          onBlur={() => setEditing(false)}
          openMenuOnFocus={false}
          width={100}
          autoFocus
        />
      );
    }

    return (
      <div className={styles.timezoneContainer}>
        {/*BMC Change: To enable localization for below text*/}
        <div className={styles.timezone}>{renderTimezonePicker()}</div>
        <Button variant="secondary" onClick={onToggleChangeTimezone} size="sm">
          <Trans i18nKey={'bmcgrafana.time-region-editor.change-timezone-btn'}>Change timezone</Trans>
        </Button>
      </div>
    );
  };

  return (
    <FieldSet className={styles.wrapper}>
      {/*BMC Change: To enable localization for below text*/}
      <Field label={t('bmcgrafana.time-region-editor.from-label', 'From')}>
        <HorizontalGroup spacing="xs">
          <Select
            options={daysList}
            isClearable
            placeholder={t('bmcgrafana.time-region-editor.everyday-placeholder', 'Everyday')}
            value={value.fromDayOfWeek ?? null}
            onChange={(v) => onFromDayOfWeekChange(v)}
            width={20}
          />
          <TimePickerInput
            value={getTime(value.from)}
            onChange={(v) => onTimeChange(v, 'from')}
            allowEmpty={true}
            placeholder="HH:mm"
            width={100}
          />
        </HorizontalGroup>
      </Field>
      {/*BMC Change: To enable localization for below text*/}
      <Field label={t('bmcgrafana.time-region-editor.to-label', 'To')}>
        <HorizontalGroup spacing="xs">
          {(value.fromDayOfWeek || value.toDayOfWeek) && (
            <Select
              options={daysList}
              isClearable
              placeholder={getToPlaceholder()}
              value={value.toDayOfWeek ?? null}
              onChange={(v) => onToDayOfWeekChange(v)}
              width={20}
            />
          )}
          <TimePickerInput
            value={getTime(value.to)}
            onChange={(v) => onTimeChange(v, 'to')}
            allowEmpty={true}
            placeholder="HH:mm"
            width={100}
          />
        </HorizontalGroup>
      </Field>
      <Field label={t('bmcgrafana.time-region-editor.timezone-label', 'Timezone')}>{renderTimezone()}</Field>
    </FieldSet>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css({
      maxWidth: theme.spacing(60),
      marginBottom: theme.spacing(2),
    }),
    timezoneContainer: css`
      padding: 5px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    `,
    timezone: css`
      margin-right: 5px;
    `,
  };
};
