// eslint-disable-next-line no-restricted-imports
import moment from 'moment';

import { TimeRange, dateTime, TimeZone } from '@grafana/data';

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
    const fromDate = moment(dateStrArr?.[0]);
    const toDate = moment(dateStrArr?.[1]);
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
  // preview date saved is in GMT format.
  return 'From: ' + JSON.parse(JSON.stringify(timeRange.from)) + ' - To: ' + JSON.parse(JSON.stringify(timeRange.to));
};
