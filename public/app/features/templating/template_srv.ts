import { escape, isString, property } from 'lodash';

import {
  AdHocVariableFilter,
  AdHocVariableModel,
  ScopedVar,
  ScopedVars,
  TimeRange,
  TypedVariableModel,
  deprecationWarning,
} from '@grafana/data';
import {
  TemplateSrv as BaseTemplateSrv,
  VariableInterpolation,
  getDataSourceSrv,
  setTemplateSrv,
} from '@grafana/runtime';
import { VariableCustomFormatterFn, sceneGraph } from '@grafana/scenes';
import { VariableFormatID } from '@grafana/schema';

import { variableAdapters } from '../variables/adapters';
import { ALL_VARIABLE_TEXT, ALL_VARIABLE_VALUE } from '../variables/constants';
import { isAdHoc } from '../variables/guard';
import { getFilteredVariables, getVariableWithName, getVariables } from '../variables/state/selectors';
import { dateRangeExtract, variableRegex } from '../variables/utils';

import { formatVariableValue } from './formatVariableValue';
import { macroRegistry } from './macroRegistry';

interface FieldAccessorCache {
  [key: string]: (obj: any) => any;
}

/**
 * Internal regex replace function
 */
type ReplaceFunction = (fullMatch: string, variableName: string, fieldPath: string, format: string) => string;

export interface TemplateSrvDependencies {
  getFilteredVariables: typeof getFilteredVariables;
  getVariables: typeof getVariables;
  getVariableWithName: typeof getVariableWithName;
}

const runtimeDependencies: TemplateSrvDependencies = {
  getFilteredVariables,
  getVariables,
  getVariableWithName,
};

export class TemplateSrv implements BaseTemplateSrv {
  private _variables: any[];
  private regex = variableRegex;
  private index: any = {};
  private grafanaVariables = new Map<string, any>();
  private timeRange?: TimeRange | null = null;
  private fieldAccessorCache: FieldAccessorCache = {};

  constructor(private dependencies: TemplateSrvDependencies = runtimeDependencies) {
    this._variables = [];
  }

  init(variables: any, timeRange?: TimeRange) {
    this._variables = variables;
    this.timeRange = timeRange;
    this.updateIndex();
  }

  /**
   * @deprecated: this instance variable should not be used and will be removed in future releases
   *
   * Use getVariables function instead
   */
  get variables(): any[] {
    deprecationWarning('template_srv.ts', 'variables', 'getVariables');
    return this.getVariables();
  }

  getVariables(): TypedVariableModel[] {
    return this.dependencies.getVariables();
  }

  updateIndex() {
    const existsOrEmpty = (value: any) => value || value === '';

    this.index = this._variables.reduce((acc, currentValue) => {
      if (currentValue.current && (currentValue.current.isNone || existsOrEmpty(currentValue.current.value))) {
        acc[currentValue.name] = currentValue;
      }
      return acc;
    }, {});

    if (this.timeRange) {
      const from = this.timeRange.from.valueOf().toString();
      const to = this.timeRange.to.valueOf().toString();

      this.index = {
        ...this.index,
        ['__from']: {
          current: { value: from, text: from },
        },
        ['__to']: {
          current: { value: to, text: to },
        },
      };
    }
  }

  updateTimeRange(timeRange: TimeRange) {
    this.timeRange = timeRange;
    this.updateIndex();
  }

  variableInitialized(variable: any) {
    this.index[variable.name] = variable;
  }

  getAdhocFilters(datasourceName: string): AdHocVariableFilter[] {
    let filters: any = [];
    let ds = getDataSourceSrv().getInstanceSettings(datasourceName);

    if (!ds) {
      return [];
    }

    for (const variable of this.getAdHocVariables()) {
      const variableUid = variable.datasource?.uid;

      if (variableUid === ds.uid) {
        filters = filters.concat(variable.filters);
      } else if (variableUid?.indexOf('$') === 0) {
        if (this.replace(variableUid) === datasourceName) {
          filters = filters.concat(variable.filters);
        }
      }
    }

    return filters;
  }

  setGrafanaVariable(name: string, value: any) {
    this.grafanaVariables.set(name, value);
  }

  /**
   * @deprecated: setGlobalVariable function should not be used and will be removed in future releases
   *
   * Use addVariable action to add variables to Redux instead
   */
  setGlobalVariable(name: string, variable: any) {
    deprecationWarning('template_srv.ts', 'setGlobalVariable', '');
    this.index = {
      ...this.index,
      [name]: {
        current: variable,
      },
    };
  }

  getVariableName(expression: string) {
    this.regex.lastIndex = 0;
    const match = this.regex.exec(expression);
    if (!match) {
      return null;
    }
    const variableName = match.slice(1).find((match) => match !== undefined);
    return variableName;
  }

  containsTemplate(target: string | undefined): boolean {
    if (!target) {
      return false;
    }
    const name = this.getVariableName(target);
    const variable = name && this.getVariableAtIndex(name);
    return variable !== null && variable !== undefined;
  }

  variableExists(expression: string): boolean {
    deprecationWarning('template_srv.ts', 'variableExists', 'containsTemplate');
    return this.containsTemplate(expression);
  }

  highlightVariablesAsHtml(str: string) {
    if (!str || !isString(str)) {
      return str;
    }

    str = escape(str);
    return this._replaceWithVariableRegex(str, undefined, (match, variableName) => {
      if (this.getVariableAtIndex(variableName)) {
        return '<span class="template-variable">' + match + '</span>';
      }
      return match;
    });
  }

  getAllValue(variable: any) {
    if (variable.allValue) {
      return variable.allValue;
    }
    const values = [];
    for (let i = 1; i < variable.options.length; i++) {
      values.push(variable.options[i].value);
    }
    return values;
  }

  private getFieldAccessor(fieldPath: string) {
    const accessor = this.fieldAccessorCache[fieldPath];
    if (accessor) {
      return accessor;
    }

    return (this.fieldAccessorCache[fieldPath] = property(fieldPath));
  }

  private getVariableValue(scopedVar: ScopedVar, fieldPath: string | undefined) {
    if (fieldPath) {
      return this.getFieldAccessor(fieldPath)(scopedVar.value);
    }

    return scopedVar.value;
  }

  private getVariableText(scopedVar: ScopedVar, value: any) {
    if (scopedVar.value === value || typeof value !== 'string') {
      return scopedVar.text;
    }

    return value;
  }

  // BMC changes - update function definition, emptyValue & customAllValue parameters added
  replace(
    target?: string,
    scopedVars?: ScopedVars,
    format?: string | Function | undefined,
    interpolations?: VariableInterpolation[],
    emptyValue?: string,
    customAllValue?: boolean
  ): string {
    if (scopedVars && scopedVars.__sceneObject) {
      return sceneGraph.interpolate(
        scopedVars.__sceneObject.value,
        target,
        scopedVars,
        format as string | VariableCustomFormatterFn | undefined
      );
    }

    if (!target) {
      return target ?? '';
    }

    this.regex.lastIndex = 0;

    return this._replaceWithVariableRegex(target, format, (match, variableName, fieldPath, fmt) => {
      const value = this._evaluateVariableExpression(
        match,
        variableName,
        fieldPath,
        fmt,
        scopedVars,
        emptyValue,
        customAllValue
      );

      // If we get passed this interpolations map we will also record all the expressions that were replaced
      if (interpolations) {
        interpolations.push({ match, variableName, fieldPath, format: fmt, value, found: value !== match });
      }

      return value;
    });
  }

  // BMC changes - update function definition, emptyValue parameter added
  private _evaluateVariableExpression(
    match: string,
    variableName: string,
    fieldPath: string,
    format: string | VariableCustomFormatterFn | undefined,
    scopedVars: ScopedVars | undefined,
    emptyValue?: string,
    customAllValue?: boolean
  ) {
    const variable = this.getVariableAtIndex(variableName);
    const scopedVar = scopedVars?.[variableName];

    if (scopedVar) {
      const value = this.getVariableValue(scopedVar, fieldPath);
      const text = this.getVariableText(scopedVar, value);

      if (value !== null && value !== undefined) {
        // BMC changes - add emptyValue as a parameter
        return formatVariableValue(value, format, variable, text, emptyValue, customAllValue);
      }
    }

    if (!variable) {
      if (macroRegistry[variableName]) {
        return macroRegistry[variableName](match, fieldPath, scopedVars, format);
      }

      return match;
    }

    if (format === VariableFormatID.QueryParam || isAdHoc(variable)) {
      const value = variableAdapters.get(variable.type).getValueForUrl(variable);
      const text = isAdHoc(variable) ? variable.id : variable.current.text;

      // BMC changes - add emptyValue as a parameter
      return formatVariableValue(value, format, variable, text, emptyValue, customAllValue);
    }

    const systemValue = this.grafanaVariables.get(variable.current.value);
    if (systemValue) {
      // BMC changes - add emptyValue as a parameter
      return formatVariableValue(systemValue, format, variable, undefined, emptyValue, customAllValue);
    }

    let value = variable.current.value;
    let text = variable.current.text;

    if (this.isAllValue(value)) {
      value = this.getAllValue(variable);
      text = ALL_VARIABLE_TEXT;
      // skip formatting of custom all values unless format set to text or percentencode
      if (variable.allValue && format !== VariableFormatID.Text && format !== VariableFormatID.PercentEncode) {
        // BMC changes - add emptyValue as a parameter
        return this.replace(value, undefined, undefined, undefined, emptyValue, customAllValue);
      }
    }

    if (fieldPath) {
      const fieldValue = this.getVariableValue({ value, text }, fieldPath);
      if (fieldValue !== null && fieldValue !== undefined) {
        return formatVariableValue(fieldValue, format, variable, text, emptyValue, customAllValue);
      }
    }
    // BMC code
    if (variable.type === 'datepicker' && (format === 'from' || format === 'to')) {
      const dateTimeVal = dateRangeExtract(value);
      switch (format) {
        case 'from':
          return dateTimeVal[0] ?? match;
        case 'to':
          return dateTimeVal[1] ?? match;
        default:
          return match;
      }
    }
    // End
    // BMC changes - add emptyValue as a parameter
    return formatVariableValue(value, format, variable, text, emptyValue, customAllValue);
  }

  /**
   * Tries to unify the different variable format capture groups into a simpler replacer function
   */
  private _replaceWithVariableRegex(text: string, format: string | Function | undefined, replace: ReplaceFunction) {
    this.regex.lastIndex = 0;

    return text.replace(this.regex, (match, var1, var2, fmt2, var3, fieldPath, fmt3) => {
      const variableName = var1 || var2 || var3;
      const fmt = fmt2 || fmt3 || format;
      return replace(match, variableName, fieldPath, fmt);
    });
  }

  isAllValue(value: any) {
    return value === ALL_VARIABLE_VALUE || (Array.isArray(value) && value[0] === ALL_VARIABLE_VALUE);
  }

  replaceWithText(target: string, scopedVars?: ScopedVars) {
    deprecationWarning('template_srv.ts', 'replaceWithText()', 'replace(), and specify the :text format');
    return this.replace(target, scopedVars, 'text');
  }

  private getVariableAtIndex(name: string) {
    if (!name) {
      return;
    }

    if (!this.index[name]) {
      return this.dependencies.getVariableWithName(name);
    }

    return this.index[name];
  }

  private getAdHocVariables(): AdHocVariableModel[] {
    return this.dependencies.getFilteredVariables(isAdHoc) as AdHocVariableModel[];
  }
}

// Expose the template srv
const srv = new TemplateSrv();

setTemplateSrv(srv);

export const getTemplateSrv = () => srv;
