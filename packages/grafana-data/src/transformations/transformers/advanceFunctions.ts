/*
BMC File
Author - Murtuza Ahmedi
*/
import { map } from 'rxjs/operators';

import { reduceField, ReducerID } from '..';
import { getFieldDisplayName } from '../..';
import { DataFrame, DataTransformerInfo, Field, Vector, FieldType, FieldMatcher } from '../../types';
import { ArrayVector } from '../../vector';
import { RowVector } from '../../vector/RowVector';
import { getFieldMatcher } from '../matchers';
import { FieldMatcherID } from '../matchers/ids';

import { ensureColumnsTransformer } from './ensureColumns';
import {
  FilterByValueTransformerOptions,
  FilterByValueType,
  FilterByValueMatch,
  filterDataByValues,
} from './filterByValue';
import { DataTransformerID } from './ids';
import { sortDataFrames } from './sortBy';

export enum AdvFuncList {
  AccumulativeTotal = 'accumulativeTotal',
  AccumulativePercentage = 'accumulativePercentage',
  PercentageAgainstMaximumValue = 'percentageAgainstMaximumValue',
  PercentageAgainstInitialValue = 'percentageAgainstInitialValue',
  PercentageAgainstColumn = 'percentageAgainstColumn',
  PercentageChangeAgainstColumn = 'percentageChangeAgainstColumn',
  DeltaFromLastN = 'deltaFromLastN',
  PercentageAgainstTotal = 'percentageAgainstTotal',
  Percentile = 'percentile',
  TopNRank = 'topNRank',
}

export interface PercentageAgainstMaxOptions {
  fieldName: string;
  maxValue: number;
}

export interface AdvFuncTransformerOptions {
  functionName: AdvFuncList;
  fieldName: string;
  functionLabel: string;
  againstField?: string;
  numberOfPrevRows?: number;
  isDeltaFromLastPercentage?: boolean;
  percentile: number;
  rank: number;
  TopNAlias: string;
}

type ValuesCreator = (data: DataFrame) => Vector;

export const advanceFunctionsTransformer: DataTransformerInfo<AdvFuncTransformerOptions> = {
  id: DataTransformerID.advanceFunctions,
  name: 'Advanced functions',
  description:
    'Transform results by applying post-processing calculations to the initial query results. For example, Accumulative total, Percentage against maximum value, and so on.',
  defaultOptions: {
    functionName: AdvFuncList.AccumulativeTotal,
    functionLabel: 'Accumulative total',
    fieldName: '',
  },
  operator: (options, ctx) => (source) => {
    const operator = ensureColumnsTransformer.operator(null, ctx);
    return source.pipe(
      operator,
      map((data) => {
        if (!isFieldSeletected(options.fieldName, options.functionName, options.againstField)) {
          return data;
        }

        if (options.functionName === AdvFuncList.Percentile) {
          let matcher = getFieldMatcher({
            id: FieldMatcherID.byName,
            options: options.fieldName,
          });
          return reducedPercentileRow(data, matcher, options);
        }

        // Sort the data frame in descending order to assign rank
        if (options.functionName === AdvFuncList.TopNRank) {
          data = sortDataFrames(data, [{ field: options.fieldName, desc: true }]);
        }

        let creator: ValuesCreator | undefined = undefined;
        let functionName = options.functionName ?? AdvFuncList.PercentageAgainstMaximumValue;
        creator = getValueCreator(options, data, functionName);

        // Nothing configured
        if (!creator) {
          return data;
        }

        const fieldName =
          options.functionName === AdvFuncList.TopNRank
            ? options.TopNAlias || options.functionLabel + ' of ' + options.fieldName
            : options.functionLabel;
        data = data.map((frame) => {
          // delegate field creation to the specific function
          const values = creator!(frame);
          if (!values) {
            return frame;
          }

          const field: Field = {
            name: fieldName,
            type: FieldType.number,
            config: { decimals: showDecimals(functionName, options) ? 2 : null },
            values,
          };
          let fields: Field[] = [];

          fields = [...frame.fields, field];
          return {
            ...frame,
            fields,
          };
        });

        // filter data if N value is provided for top N Rank
        if (options.functionName === AdvFuncList.TopNRank && options.rank > 0) {
          data = filterDataFrameByRank(data, options, fieldName);
        }
        return data;
      })
    );
  },
};

const showDecimals = (functionName: string, options: AdvFuncTransformerOptions): boolean => {
  return (
    functionName === AdvFuncList.PercentageAgainstInitialValue ||
    functionName === AdvFuncList.PercentageAgainstMaximumValue ||
    functionName === AdvFuncList.AccumulativePercentage ||
    functionName === AdvFuncList.PercentageAgainstColumn ||
    functionName === AdvFuncList.PercentageChangeAgainstColumn ||
    functionName === AdvFuncList.PercentageAgainstTotal ||
    (functionName === AdvFuncList.DeltaFromLastN && (options.isDeltaFromLastPercentage ?? false))
  );
};

const isFieldSeletected = (fieldName: string, functionName: string, againstField?: string): boolean => {
  if (
    !fieldName ||
    (functionName === AdvFuncList.PercentageAgainstColumn && !againstField) ||
    (functionName === AdvFuncList.PercentageChangeAgainstColumn && !againstField)
  ) {
    return false;
  }
  return true;
};

const generatePercentage = (field: Field, divisor = 1): number => {
  if (divisor === 0) {
    divisor = 1;
  }
  let percent = 0;
  const currentValue = getFieldValue(field);
  percent = percentReducer(currentValue, divisor);
  return !isNaN(percent) ? percent : 0;
};

const percentReducer = (dividend: number, divisor: number): number => {
  if (!divisor) {
    return 0;
  }
  return (dividend / divisor) * 100;
};

const getFieldValue = (field: Field): number => {
  const data = field.values;
  let currentValue;
  currentValue = (data.length && data.get(0)) || 0;
  return currentValue;
};

const generateAccumulations = (
  frame: DataFrame,
  iter: RowVector,
  row: Field,
  functionName: string,
  columnSum?: number
): number[] => {
  let accumulativeTotals = [];
  let accumulativeTotalsPercentage = [];
  for (let i = 0; i < frame.length; i++) {
    iter.rowIndex = i;
    let val = getFieldValue(row);
    if (accumulativeTotals.length === 0) {
      accumulativeTotals.push(val);
    } else {
      val += accumulativeTotals[accumulativeTotals.length - 1];
      accumulativeTotals.push(val);
    }
    // calculate accumulative percentage
    if (columnSum !== undefined) {
      accumulativeTotalsPercentage.push(percentReducer(val, columnSum));
    }
  }
  return functionName === AdvFuncList.AccumulativeTotal ? accumulativeTotals : accumulativeTotalsPercentage;
};

const generatePercentAgainstColumn = (
  frame: DataFrame,
  fieldValues: RowVector,
  againstFieldValues: RowVector,
  calculateChange: boolean
): number[] => {
  let percents: number[] = [];
  for (let i = 0; i < frame.length; i++) {
    fieldValues.rowIndex = i;
    againstFieldValues.rowIndex = i;
    let percent = 0;
    const currentValue = (fieldValues.length && fieldValues.get(0)) || 0;
    const divisor = (againstFieldValues.length && againstFieldValues.get(0)) || 0;
    if (calculateChange) {
      const diff = currentValue - divisor;
      percent = percentReducer(diff, divisor);
    } else {
      percent = percentReducer(currentValue, divisor);
    }
    percent = !isNaN(percent) ? percent : 0;
    percents.push(percent);
  }
  return percents;
};

const generateDeltaFromLast = (
  frame: DataFrame,
  iter: RowVector,
  row: Field,
  options: AdvFuncTransformerOptions
): number[] => {
  let deltas: number[] = [];
  for (let i = 0; i < frame.length; i++) {
    iter.rowIndex = i;
    const currentValue = getFieldValue(row);
    const previousRowIndex = i - options.numberOfPrevRows!;
    let previousValue = 0;
    let delta = 0;
    // check if previous row is available
    if (previousRowIndex >= 0 && previousRowIndex < frame.length) {
      iter.rowIndex = previousRowIndex;
      previousValue = getFieldValue(row);
      delta = currentValue - previousValue;
    }

    if (options.isDeltaFromLastPercentage) {
      deltas.push(percentReducer(delta, previousValue));
    } else {
      deltas.push(delta);
    }
  }
  return deltas;
};

const getValueCreator = (
  options: AdvFuncTransformerOptions,
  allFrames: DataFrame[],
  functionName: string
): ValuesCreator => {
  let matcher = getFieldMatcher({
    id: FieldMatcherID.byName,
    options: options.fieldName,
  });

  let againstMatcher = getFieldMatcher({
    id: FieldMatcherID.byName,
    options: options.againstField,
  });

  return (frame: DataFrame) => {
    // Find the columns that should be examined
    let selectedField: Field<any, Vector<any>>;
    const columns: Vector[] = [];
    const againstColumns: Vector[] = [];
    for (const field of frame.fields) {
      if (matcher(field, frame, allFrames) && getFieldDisplayName(field, frame, allFrames) === options.fieldName) {
        columns.push(field.values);
        selectedField = field;
      }

      // for percentAgainstColumn and percentChangeAgainstColumn
      if (
        options.functionName === AdvFuncList.PercentageAgainstColumn ||
        options.functionName === AdvFuncList.PercentageChangeAgainstColumn
      ) {
        if (
          againstMatcher(field, frame, allFrames) &&
          getFieldDisplayName(field, frame, allFrames) === options.againstField
        ) {
          againstColumns.push(field.values);
        }
      }
    }

    if (columns.length > 1 || againstColumns.length > 1) {
      throw new Error('Error in applying selected advanced function');
    }

    // Prepare a "fake" field for the row
    const iter = new RowVector(columns);
    const row: Field = {
      name: 'temp',
      values: iter,
      type: FieldType.number,
      config: {},
    };

    let vals: number[] = [];
    let divisor;
    let againstIter;
    let results = reduceField({
      field: selectedField!,
      reducers: [ReducerID.sum],
    });

    switch (functionName) {
      case AdvFuncList.AccumulativePercentage:
        vals = generateAccumulations(frame, iter, row, functionName, results[ReducerID.sum]);
        break;
      case AdvFuncList.AccumulativeTotal:
        vals = generateAccumulations(frame, iter, row, functionName);
        break;
      case AdvFuncList.DeltaFromLastN:
        vals = generateDeltaFromLast(frame, iter, row, options);
        break;
      case AdvFuncList.PercentageAgainstColumn:
        againstIter = new RowVector(againstColumns);
        vals = generatePercentAgainstColumn(frame, iter, againstIter, false);
        break;
      case AdvFuncList.PercentageAgainstInitialValue:
        divisor = iter.get(0);
        vals = generateVals(divisor, frame, row, iter);
        break;
      case AdvFuncList.PercentageAgainstMaximumValue:
        divisor = results[ReducerID.max];
        vals = generateVals(divisor, frame, row, iter);
        break;
      case AdvFuncList.PercentageChangeAgainstColumn:
        againstIter = new RowVector(againstColumns);
        vals = generatePercentAgainstColumn(frame, iter, againstIter, true);
        break;
      case AdvFuncList.PercentageAgainstTotal:
        divisor = results[ReducerID.sum];
        vals = generateVals(divisor, frame, row, iter);
        break;
      case AdvFuncList.TopNRank:
        // divisor = results[ReducerID.sum];
        vals = generateRanks(frame, row, iter);
        break;
    }
    return new ArrayVector(vals);
  };
};

const generateVals = (divisor: number, frame: DataFrame, row: Field, iter: RowVector) => {
  let vals = [];
  if (divisor === 0) {
    vals = new Array(frame.length).fill(0);
  } else {
    for (let i = 0; i < frame.length; i++) {
      iter.rowIndex = i;
      const val = generatePercentage(row, divisor);
      vals.push(val);
    }
  }
  return vals;
};

export function reducedPercentileRow(
  data: DataFrame[],
  matcher: FieldMatcher,
  options: AdvFuncTransformerOptions
): DataFrame[] {
  // sort data frame
  const sortedData = sortDataFrames(data, [{ field: options.fieldName }]);

  const processed: DataFrame[] = [];

  for (const series of sortedData) {
    const fields: Field[] = [];
    let rowIndex = -1;
    for (const field of series.fields) {
      if (matcher(field, series, sortedData)) {
        rowIndex = calculatePercentile(field!, options.percentile);
      }
    }

    if (rowIndex > -1) {
      for (const field of series.fields) {
        const copy = {
          ...field,
          values: new ArrayVector([field.values.get(rowIndex)]),
        };
        fields.push(copy);
      }
      if (fields.length) {
        processed.push({
          ...series,
          fields,
          length: 1, // always one row
        });
      }
    }
  }

  return processed;
}

function calculatePercentile(field: Field, percentile: number): number {
  const rowsCount = field.values.length;
  // Formula for percentile
  const nthPercentileRow = (percentile * (rowsCount + 1)) / 100;
  // Rounding off to get exact row number
  const nthPercentileRowIndex = (nthPercentileRow < 1 ? Math.ceil(nthPercentileRow) : Math.floor(nthPercentileRow)) - 1;
  return nthPercentileRowIndex;
}

const generateRanks = (frame: DataFrame, row: Field, iter: RowVector) => {
  let prevVal;
  let rank = 0;
  let ranks = [];

  for (let i = 0; i < frame.length; i++) {
    iter.rowIndex = i;
    const val = getFieldValue(row);
    if (val !== prevVal) {
      ranks.push(++rank);
    } else {
      ranks.push(rank);
    }
    prevVal = val;
  }
  return ranks;
};

const filterDataFrameByRank = (
  data: DataFrame[],
  options: AdvFuncTransformerOptions,
  fieldName: string
): DataFrame[] => {
  const filterOptions: FilterByValueTransformerOptions = {
    filters: [
      {
        fieldName: fieldName,
        config: {
          id: 'lowerOrEqual',
          options: {
            value: options.rank,
          },
        },
      },
    ],
    type: FilterByValueType.include,
    match: FilterByValueMatch.any,
  };

  const filteredFrames = filterDataByValues(data, filterOptions);
  return filteredFrames;
};
