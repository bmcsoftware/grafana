/*
BMC File
Author - Murtuza Ahmedi
*/
import { isEqual } from 'lodash';
import React from 'react';
import { map, of, OperatorFunction } from 'rxjs';

import {
  DataFrame,
  DataTransformerID,
  FieldType,
  getFieldDisplayName,
  KeyValue,
  SelectableValue,
  standardTransformers,
  TransformerRegistryItem,
  TransformerUIProps,
} from '@grafana/data';
import {
  AdvanceFunctionsList,
  AdvanceFunctionsTransformerOptions,
} from '@grafana/data/src/transformations/transformers/advanceFunctions';
import { Input, RadioButtonGroup, Select } from '@grafana/ui';

interface AdvanceFunctionsTransformerEditorProps extends TransformerUIProps<AdvanceFunctionsTransformerOptions> {}
interface AdvanceFunctionsTransformerEditorState {
  names: string[];
}
const okTypes = new Set<FieldType>([FieldType.number]);

const functionOptions: Array<SelectableValue<AdvanceFunctionsList>> = [
  {
    value: AdvanceFunctionsList.AccumulativePercentage,
    label: 'Accumulative percentage',
    description: 'Returns accumulative percentage of the total for the selected field',
  },
  {
    value: AdvanceFunctionsList.AccumulativeTotal,
    label: 'Accumulative total',
    description: 'Returns running accumulative total for the selected field',
  },
  {
    value: AdvanceFunctionsList.DeltaFromLastN,
    label: 'Delta from last N',
    description: 'Calculate change between the current row and row minus N',
  },
  {
    value: AdvanceFunctionsList.PercentageAgainstColumn,
    label: 'Percentage against column',
    description: 'Returns percentage of selected field against value in another report column.',
  },
  {
    value: AdvanceFunctionsList.PercentageAgainstInitialValue,
    label: 'Percentage against initial value',
    description: 'Returns running percentage based on the initial value in the column',
  },
  {
    value: AdvanceFunctionsList.PercentageAgainstMaximumValue,
    label: 'Percentage against maximum value',
    description: 'Returns percentage of selected field according to a maximum value',
  },
  {
    value: AdvanceFunctionsList.PercentageChangeAgainstColumn,
    label: 'Percentage change against column',
    description: 'Returns percentage of change of selected field against value in another report column.',
  },
  {
    value: AdvanceFunctionsList.PercentageAgainstTotal,
    label: 'Percentage against total value',
    description: 'Returns percentage of total value for the selected field.',
  },
];

export class AdvanceFunctionsTransformerEditor extends React.PureComponent<
  AdvanceFunctionsTransformerEditorProps,
  AdvanceFunctionsTransformerEditorState
> {
  constructor(props: AdvanceFunctionsTransformerEditorProps) {
    super(props);
  }

  componentDidMount() {
    this.initOptions();
  }

  componentDidUpdate(oldProps: AdvanceFunctionsTransformerEditorProps) {
    if (!isEqual(this.props.input, oldProps.input)) {
      this.initOptions();
    }
  }

  initOptions() {
    const subscription = of(this.props.input)
      .pipe(this.extractAllNames())
      .subscribe((names) => {
        this.setState({ names }, () => subscription.unsubscribe());
      });
  }

  private extractAllNames(): OperatorFunction<DataFrame[], string[]> {
    return (source) =>
      source.pipe(
        map((input) => {
          const allNames: string[] = [];
          const byName: KeyValue<boolean> = {};

          for (const frame of input) {
            for (const field of frame.fields) {
              if (!okTypes.has(field.type)) {
                continue;
              }
              const displayName = getFieldDisplayName(field, frame, input);
              if (!byName[displayName]) {
                byName[displayName] = true;
                allNames.push(displayName);
              }
            }
          }

          return allNames;
        })
      );
  }

  onFunctionChanged = (input: SelectableValue<AdvanceFunctionsList>) => {
    const { options, onChange } = this.props;
    const functionName = input.value ?? AdvanceFunctionsList.PercentageAgainstMaximumValue;
    const functionLabel = input.label ?? functionOptions[0].label;
    if (options.functionName !== AdvanceFunctionsList.DeltaFromLastN) {
      onChange({
        ...options,
        functionLabel: functionLabel!,
        functionName: functionName,
        numberOfPrevRows: 1,
        isDeltaFromLastPercentage: false,
      });
    } else {
      onChange({
        ...options,
        functionLabel: functionLabel!,
        functionName: functionName,
      });
    }
  };

  onFieldChanged = (input: SelectableValue<string>) => {
    const { options, onChange } = this.props;
    const fieldName = input.value ?? '';
    onChange({
      ...options,
      fieldName: fieldName,
    });
  };

  onAgainstFieldChanged = (input: SelectableValue<string>) => {
    const { options, onChange } = this.props;
    const fieldName = input.value ?? '';
    onChange({
      ...options,
      againstField: fieldName,
    });
  };

  onPreviousRowsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { options, onChange } = this.props;
    onChange({
      ...options,
      numberOfPrevRows: +event.target.value,
    });
  };

  setDeltaFromLastPercentage = (showPercentage: string) => {
    const { options, onChange } = this.props;
    onChange({
      ...options,
      isDeltaFromLastPercentage: showPercentage === 'yes' ? true : false,
    });
  };

  showAgainstField = () => {
    const { options } = this.props;
    return (
      options.functionName === AdvanceFunctionsList.PercentageAgainstColumn ||
      options.functionName === AdvanceFunctionsList.PercentageChangeAgainstColumn
    );
  };
  //---------------------------------------------------------
  // Render
  //---------------------------------------------------------

  render() {
    const { options } = this.props;
    const fieldNames = this.state?.names?.map((name) => {
      return { label: name, value: name };
    });
    const functionName = options.functionName ?? AdvanceFunctionsList.PercentageAgainstMaximumValue;
    const fieldName = options.fieldName;

    return (
      <div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <div className="gf-form-label width-8">Function name</div>
            <Select
              menuShouldPortal
              className="width-18"
              options={functionOptions}
              value={functionOptions.find((v) => v.value === functionName)}
              onChange={this.onFunctionChanged}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label width-8">Field name</div>
            <Select
              menuShouldPortal
              className="width-18"
              options={fieldNames}
              value={fieldNames?.find((v) => v.value === fieldName)}
              onChange={this.onFieldChanged}
            />
          </div>
        </div>
        {this.showAgainstField() && (
          <div className="gf-form-inline">
            <div className="gf-form gf-form--grow">
              <div className="gf-form-label width-8">Against field name</div>
              <Select
                menuShouldPortal
                className="width-18"
                options={fieldNames}
                value={fieldNames?.find((v) => v.value === options.againstField)}
                onChange={this.onAgainstFieldChanged}
              />
            </div>
          </div>
        )}
        {functionName === AdvanceFunctionsList.DeltaFromLastN && (
          <>
            <div className="gf-form-inline">
              <div className="gf-form gf-form--grow">
                <div className="gf-form-label width-8">Previous row</div>
                <Input
                  className="width-18"
                  type="number"
                  value={options.numberOfPrevRows ?? 1}
                  placeholder="Previous row"
                  onChange={this.onPreviousRowsChange}
                />
              </div>
            </div>
            <div className="gf-form-inline">
              <div className="gf-form gf-form--grow">
                <div className="gf-form-label width-8">Percentage</div>
                <RadioButtonGroup
                  value={options.isDeltaFromLastPercentage ? 'yes' : 'no'}
                  options={[
                    { label: 'Yes', value: 'yes' },
                    { label: 'No', value: 'no' },
                  ]}
                  onChange={this.setDeltaFromLastPercentage}
                ></RadioButtonGroup>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}

export const advanceFunctionsTransformRegistryItem: TransformerRegistryItem<AdvanceFunctionsTransformerOptions> = {
  id: DataTransformerID.advanceFunctions,
  editor: AdvanceFunctionsTransformerEditor,
  transformation: standardTransformers.advanceFunctionsTransformer,
  name: 'Advanced functions',
  description:
    'Transform results by applying post-processing calculations to the initial query results. For example, Accumulative total, Percentage against maximum value, and so on.',
};
