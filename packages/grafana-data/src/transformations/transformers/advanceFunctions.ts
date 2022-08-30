/*
BMC File
Author - Murtuza Ahmedi
*/
import { DataTransformerID } from './ids';
import { ArrayVector } from '../../vector';
import { DataFrame, DataTransformerInfo, Field, Vector, FieldType, NullValueMode } from '../../types';
import { ensureColumnsTransformer } from './ensureColumns';
import { getFieldMatcher } from '../matchers';
import { FieldMatcherID } from '../matchers/ids';
import { RowVector } from '../../vector/RowVector';
import { map } from 'rxjs/operators';

export enum AdvanceFunctionsList {
  AccumulativeTotal = 'accumulativeTotal',
  PercentageAgainstMaximumValue = 'percentageAgainstMaximumValue',
  PercentageAgainstInitialValue = 'percentageAgainstInitialValue',
}

export interface PercentageAgainstMaxOptions {
  fieldName: string;
  maxValue: number;
}

export interface AdvanceFunctionsTransformerOptions {
  functionName: AdvanceFunctionsList;
  fieldName: string;
  functionLabel: string;
  nullValueMode?: NullValueMode;
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
        if (!options.fieldName) {
          return data;
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

          const showDecimals =
            functionName === AdvanceFunctionsList.PercentageAgainstInitialValue ||
            functionName === AdvanceFunctionsList.PercentageAgainstMaximumValue;

          const field: Field = {
            name: options.functionLabel,
            type: FieldType.number,
            config: { decimals: showDecimals ? 2 : null },
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

const getMaxValue = (frame: DataFrame, iter: RowVector): number => {
  let maxValue = 0;
  let currentValue = 0;
  for (let i = 0; i < frame.length; i++) {
    iter.rowIndex = i;
    const data = iter;
    for (let j = 0; j < data.length; j++) {
      currentValue = data.get(j);
    }
    if (currentValue > maxValue) {
      maxValue = currentValue;
    }
  }
  return !isNaN(maxValue) ? maxValue : 0;
};

const percentReducer = (field: Field, value = 1): number => {
  if (value === 0) {
    value = 1;
  }
  let percent = 0;
  const data = field.values;
  for (let i = 0; i < data.length; i++) {
    let currentValue = data.get(i);
    percent = (currentValue / value) * 100;
  }
  return !isNaN(percent) ? percent : 0;
};

const accumulativeTotalReducer = (field: Field): number => {
  const data = field.values;
  let currentValue;
  for (let i = 0; i < data.length; i++) {
    currentValue = data.get(i);
  }
  return currentValue;
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

  return (frame: DataFrame) => {
    // Find the columns that should be examined
    const columns: Vector[] = [];
    for (const field of frame.fields) {
      if (matcher(field, frame, allFrames)) {
        columns.push(field.values);
      }
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
    if (functionName === AdvanceFunctionsList.AccumulativeTotal) {
      for (let i = 0; i < frame.length; i++) {
        iter.rowIndex = i;
        let val = accumulativeTotalReducer(row);
        if (vals.length === 0) {
          vals.push(val);
        } else {
          val += vals[vals.length - 1];
          vals.push(val);
        }
      }
      return new ArrayVector(vals);
    } else if (functionName === AdvanceFunctionsList.PercentageAgainstMaximumValue) {
      divisor = getMaxValue(frame, iter);
    } else if (functionName === AdvanceFunctionsList.PercentageAgainstInitialValue) {
      divisor = iter.get(0);
    }

    if (divisor === 0) {
      vals = new Array(frame.length).fill(0);
    } else {
      for (let i = 0; i < frame.length; i++) {
        iter.rowIndex = i;
        const val = percentReducer(row, divisor);
        vals.push(val);
      }
    }
    return new ArrayVector(vals);
  };
};
