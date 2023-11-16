// eslint-disable-next-line no-restricted-imports
import moment from 'moment';

import { TimeRange, dateTime, TimeZone, rangeUtil } from '@grafana/data';

import { dateRangeExtract } from '../utils';
// eslint-disable-next-line no-restricted-imports

export const getDefaultTimeRange = (): TimeRange => {
  const to = dateTime();
  const from = dateTime();

  return {
    from,
    to,
    raw: {
      from,
      to,
    },
  };
};

export const convertQuery2TimeRange = (query: string | string[], tz?: TimeZone) => {
  const targetQuery = query instanceof Array ? query[0] : query;
  if (targetQuery) {
    const dateStrArr = dateRangeExtract(targetQuery);
    if ((!dateStrArr?.[0] && !dateStrArr?.[1]) || (dateStrArr?.[0] === 'null' && dateStrArr?.[1] === 'null')) {
      return {
        from: dateTime(null),
        to: dateTime(null),
        raw: {
          from: dateTime(null),
          to: dateTime(null),
        },
      } as TimeRange;
    }
    const fromDate = moment(dateStrArr[0]);
    const toDate = moment(dateStrArr[1]);
    const timeRange = {
      from: dateStrArr[0],
      to: dateStrArr[1],
    };
    const isRelativeTime = rangeUtil.isRelativeTimeRange(timeRange);
    if (isRelativeTime) {
      const convertedTimeRange = rangeUtil.convertRawToRange({ from: dateStrArr[0], to: dateStrArr[1] });
      return {
        from: convertedTimeRange.from,
        to: convertedTimeRange.to,
        raw: {
          from: dateStrArr[0],
          to: dateStrArr[1],
        },
      } as TimeRange;
    }

    if (fromDate.isValid() && toDate.isValid()) {
      return {
        from: fromDate,
        to: toDate,
        raw: {
          from: fromDate,
          to: toDate,
        },
      } as TimeRange;
    }
  }
  return getDefaultTimeRange();
};

export const convertTimeRange2Query = (timeRange?: TimeRange): string => {
  if (timeRange) {
    try {
      const query = getPreviewForDate(timeRange);
      return query;
    } catch (e) {}
  }
  return getPreviewForDate(getDefaultTimeRange());
};

export const getPreviewForDate = (timeRange: TimeRange) => {
  //if now is present in the raw field of timerange object
  if (rangeUtil.isRelativeTimeRange(timeRange.raw)) {
    return (
      'From: ' +
      JSON.parse(JSON.stringify(timeRange.raw.from)) +
      ' - To: ' +
      JSON.parse(JSON.stringify(timeRange.raw.to))
    );
  }
  // preview date saved is in GMT format.
  return 'From: ' + JSON.parse(JSON.stringify(timeRange.from)) + ' - To: ' + JSON.parse(JSON.stringify(timeRange.to));
};
