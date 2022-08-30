export interface SchedulerObject {
  period: PeriodType;
  months: number[] | undefined;
  monthDays: number[] | undefined;
  weekDays: number[] | undefined;
  hours: number[] | undefined;
  minutes: number[] | undefined;
}

export type PeriodType = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

export type CronType = 'period' | 'months' | 'month-days' | 'week-days' | 'hours' | 'minutes';

export interface Unit {
  type: CronType;
  min: number;
  max: number;
  total: number;
  alt?: string[];
}

export type LeadingZeroType = 'month-days' | 'hours' | 'minutes';

export type LeadingZero = boolean | LeadingZeroType[];

export type ClockFormat = '24-hour-clock' | '12-hour-clock';

export const UNITS: Unit[] = [
  {
    type: 'minutes',
    min: 0,
    max: 59,
    total: 60,
  },
  {
    type: 'hours',
    min: 0,
    max: 23,
    total: 24,
  },
  {
    type: 'month-days',
    min: 1,
    max: 31,
    total: 31,
  },
  {
    type: 'months',
    min: 1,
    max: 12,
    total: 12,
    // DO NO EDIT
    // Only used internally for Cron syntax
    // alt values used for labels are in ./locale.ts file
    alt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  },
  {
    type: 'week-days',
    min: 0,
    max: 6,
    total: 7,
    // DO NO EDIT
    // Only used internally for Cron syntax
    // alt values used for labels are in ./locale.ts file
    alt: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
];
