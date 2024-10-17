import { map } from 'rxjs/operators';

import { SynchronousDataTransformerInfo } from '../../types';
import { DataFrame, Field, FieldType } from '../../types/dataFrame';
import { ArrayVector } from '../../vector';
import { fieldMatchers } from '../matchers';
import { FieldMatcherID } from '../matchers/ids';

import { DataTransformerID } from './ids';
import { parseDynamicField } from '../parseDynamicFields';

export interface DynamicFieldsFormatterTransformerOptions {
  formatters: DynamicFieldsFormatterOptions[];
}

export interface DynamicFieldsFormatterOptions {
  /**
   * The field to convert field type
   */
  targetField?: string;
  type?: 'keyValue' | 'json' | undefined;
}

export const dynamicFieldsFormatterTransformer: SynchronousDataTransformerInfo<DynamicFieldsFormatterTransformerOptions> =
  {
    id: DataTransformerID.dynamicFieldsFormatter,
    name: 'Dynamic Fields Formatter',
    description: 'Format dynamic fields to key-value pairs or json.',
    defaultOptions: {
      fields: {},
      formatters: [{}],
    },

    operator: (options, ctx) => (source) =>
      source.pipe(map((data) => dynamicFieldsFormatterTransformer.transformer(options, ctx)(data))),

    transformer: (options: DynamicFieldsFormatterTransformerOptions) => (data: DataFrame[]) => {
      if (!Array.isArray(data) || data.length === 0) {
        return data;
      }
      return jsonFormatters(options, data) ?? [];
    },
  };

/**
 * HTML sanitizer fields for dataframe(s)
 * @param options - field type conversion options
 * @param frames - dataframe(s) with field types to convert
 * @returns dataframe(s) with converted field types
 */
export function jsonFormatters(options: DynamicFieldsFormatterTransformerOptions, frames: DataFrame[]): DataFrame[] {
  if (!options.formatters.length) {
    return frames;
  }

  const framesCopy = frames.map((frame) => ({ ...frame }));

  for (const formatter of options.formatters) {
    if (!formatter.targetField || !formatter.type) {
      continue;
    }
    const matches = fieldMatchers.get(FieldMatcherID.byName).get(formatter.targetField);
    for (const frame of framesCopy) {
      frame.fields = frame.fields.map((field) => {
        if (matches(field, frame, framesCopy)) {
          return dynamicFieldsFormatter(field, formatter);
        }
        return field;
      });
    }
  }

  return framesCopy;
}

/**
 * Parsing dyanmic field json formats and converting it into key-value or json.
 * @param field - field to convert
 * @param opts - contains user selected field and type info
 * @returns field with formatted and parsed string or json.
 *
 * @internal
 */
export function dynamicFieldsFormatter(field: Field, opts: DynamicFieldsFormatterOptions): Field {
  let values = field.values.toArray();

  values = values.map((v) => {
    return parseDynamicFieldJson(v, opts);
  });

  return {
    ...field,
    type: FieldType.string,
    values: new ArrayVector(values),
  };
}

const parseDynamicFieldJson = (data: string, opts: DynamicFieldsFormatterOptions): string => {
  const result = parseDynamicField(data);
  switch (result.type) {
    case 'Map':
      return formatMap(result.data, opts);
    case 'Text':
      if (opts.type === 'keyValue') {
        return result.data as string;
      }
      // Here message is used as the fixed key.
      return JSON.stringify({ message: result.data });
    case 'Record':
    default:
      return result.raw;
  }
};

const formatMap = (dataMap: any, opts: DynamicFieldsFormatterOptions): string => {
  const maxKeyLength = Array.from(dataMap.keys()).reduce((max: number, key: any) => Math.max(max, key.length), 0);
  if (opts.type === 'keyValue') {
    return Array.from(dataMap, ([key, value]) => {
      const pads = Math.round(maxKeyLength / key.length) + key.length;
      const keyWithPad = key.padEnd(pads === 0 ? 1 : pads, '\t');
      return `${keyWithPad}: ${value}`;
    }).join('\n');
  }
  // Convert Map to plain JavaScript object
  const dataObj = Object.fromEntries(dataMap);
  return JSON.stringify(dataObj);
};
