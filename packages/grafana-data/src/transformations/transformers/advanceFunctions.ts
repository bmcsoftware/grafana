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
import { DataTransformerID } from './ids';
import { sortDataFrames } from './sortBy';

export enum AdvanceFunctionsList {
  AccumulativeTotal = 'accumulativeTotal',
  AccumulativePercentage = 'accumulativePercentage',
  PercentageAgainstMaximumValue = 'percentageAgainstMaximumValue',
  PercentageAgainstInitialValue = 'percentageAgainstInitialValue',
  PercentageAgainstColumn = 'percentageAgainstColumn',
  PercentageChangeAgainstColumn = 'percentageChangeAgainstColumn',
  DeltaFromLastN = 'deltaFromLastN',
  PercentageAgainstTotal = 'percentageAgainstTotal',
  Percentile = 'percentile',
}

export interface PercentageAgainstMaxOptions {
  fieldName: string;
  maxValue: number;
}

export interface AdvanceFunctionsTransformerOptions {
  functionName: AdvanceFunctionsList;
  fieldName: string;
  functionLabel: string;
  againstField?: string;
  numberOfPrevRows?: number;
  isDeltaFromLastPercentage?: boolean;
  percentile: number;
}

type ValuesCreator = (data: DataFrame) => Vector;

export const advanceFunctionsTransformer: DataTransformerInfo<AdvanceFunctionsTransformerOptions> = {
  id: DataTransformerID.advanceFunctions,
  name: 'Advanced functions',
  description:
    'Transform results by applying post-processing calculations to the initial query results. For example, Accumulative total, Percentage against maximum value, and so on.',
  defaultOptions: {
    functionName: AdvanceFunctionsList.AccumulativeTotal,
    functionLabel: 'Accumulative total',
    fieldName: '',
  },
  operator: (options) => (source) => {
    const operator = ensureColumnsTransformer.operator(null);
    return source.pipe(
      operator,
      map((data) => {
        if (!isFieldSeletected(options.fieldName, options.functionName, options.againstField)) {
          return data;
        }

        if (options.functionName === AdvanceFunctionsList.Percentile) {
          let matcher = getFieldMatcher({
            id: FieldMatcherID.byName,
            options: options.fieldName,
          });
          return reducedPercentileRow(data, matcher, options);
        }

        let creator: ValuesCreator | undefined = undefined;
        let functionName = options.functionName ?? AdvanceFunctionsList.PercentageAgainstMaximumValue;
        creator = getValueCreator(options, data, functionName);
        // Nothing configured
        if (!creator) {
          return data;
        }

        return data.map((frame) => {
          // delegate field creation to the specific function
          const values = creator!(frame);
          if (!values) {
            return frame;
          }

          const field: Field = {
            name: options.functionLabel,
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
      })
    );
  },
};

const showDecimals = (functionName: string, options: AdvanceFunctionsTransformerOptions): boolean => {
  return (
    functionName === AdvanceFunctionsList.PercentageAgainstInitialValue ||
    functionName === AdvanceFunctionsList.PercentageAgainstMaximumValue ||
    functionName === AdvanceFunctionsList.AccumulativePercentage ||
    functionName === AdvanceFunctionsList.PercentageAgainstColumn ||
    functionName === AdvanceFunctionsList.PercentageChangeAgainstColumn ||
    functionName === AdvanceFunctionsList.PercentageAgainstTotal ||
    (functionName === AdvanceFunctionsList.DeltaFromLastN && (options.isDeltaFromLastPercentage ?? false))
  );
};

const isFieldSeletected = (fieldName: string, functionName: string, againstField?: string): boolean => {
  if (
    !fieldName ||
    (functionName === AdvanceFunctionsList.PercentageAgainstColumn && !againstField) ||
    (functionName === AdvanceFunctionsList.PercentageChangeAgainstColumn && !againstField)
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
  return functionName === AdvanceFunctionsList.AccumulativeTotal ? accumulativeTotals : accumulativeTotalsPercentage;
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
  options: AdvanceFunctionsTransformerOptions
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
  options: AdvanceFunctionsTransformerOptions,
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
        options.functionName === AdvanceFunctionsList.PercentageAgainstColumn ||
        options.functionName === AdvanceFunctionsList.PercentageChangeAgainstColumn
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
      case AdvanceFunctionsList.AccumulativePercentage:
        vals = generateAccumulations(frame, iter, row, functionName, results[ReducerID.sum]);
        break;
      case AdvanceFunctionsList.AccumulativeTotal:
        vals = generateAccumulations(frame, iter, row, functionName);
        break;
      case AdvanceFunctionsList.DeltaFromLastN:
        vals = generateDeltaFromLast(frame, iter, row, options);
        break;
      case AdvanceFunctionsList.PercentageAgainstColumn:
        againstIter = new RowVector(againstColumns);
        vals = generatePercentAgainstColumn(frame, iter, againstIter, false);
        break;
      case AdvanceFunctionsList.PercentageAgainstInitialValue:
        divisor = iter.get(0);
        vals = generateVals(divisor, frame, row, iter);
        break;
      case AdvanceFunctionsList.PercentageAgainstMaximumValue:
        divisor = results[ReducerID.max];
        vals = generateVals(divisor, frame, row, iter);
        break;
      case AdvanceFunctionsList.PercentageChangeAgainstColumn:
        againstIter = new RowVector(againstColumns);
        vals = generatePercentAgainstColumn(frame, iter, againstIter, true);
        break;
      case AdvanceFunctionsList.PercentageAgainstTotal:
        divisor = results[ReducerID.sum];
        vals = generateVals(divisor, frame, row, iter);
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
  options: AdvanceFunctionsTransformerOptions
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
