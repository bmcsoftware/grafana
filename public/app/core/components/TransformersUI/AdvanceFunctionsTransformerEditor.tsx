/*
BMC File
Author - Murtuza Ahmedi
*/
import React from 'react';
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
import { Select } from '@grafana/ui';
import {
  AdvanceFunctionsList,
  AdvanceFunctionsTransformerOptions,
} from '@grafana/data/src/transformations/transformers/advanceFunctions';
import { map, of, OperatorFunction } from 'rxjs';
import { isEqual } from 'lodash';

interface AdvanceFunctionsTransformerEditorProps extends TransformerUIProps<AdvanceFunctionsTransformerOptions> {}
interface AdvanceFunctionsTransformerEditorState {
  names: string[];
}

const functionOptions: Array<SelectableValue<AdvanceFunctionsList>> = [
  {
    value: AdvanceFunctionsList.AccumulativeTotal,
    label: 'Accumulative total',
    description: 'Returns running accumulative total for the selected field',
  },
  {
    value: AdvanceFunctionsList.PercentageAgainstMaximumValue,
    label: 'Percentage against maximum value',
    description: 'Returns percentage of selected field according to a maximum value',
  },
  {
    value: AdvanceFunctionsList.PercentageAgainstInitialValue,
    label: 'Percentage against initial value',
    description: 'Returns running percentage based on the initial value in the column',
  },
];

const okTypes = new Set<FieldType>([FieldType.number]);

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

  onModeChanged = (input: SelectableValue<AdvanceFunctionsList>) => {
    const { options, onChange } = this.props;
    const functionName = input.value ?? AdvanceFunctionsList.PercentageAgainstMaximumValue;
    const functionLabel = input.label ?? functionOptions[0].label;
    onChange({
      ...options,
      functionLabel: functionLabel!,
      functionName: functionName,
    });
  };

  onFieldChanged = (input: SelectableValue<string>) => {
    const { options, onChange } = this.props;
    const fieldName = input.value ?? '';
    onChange({
      ...options,
      fieldName: fieldName,
    });
  };
  //---------------------------------------------------------
  // Render
  //---------------------------------------------------------

  render() {
    const { options, input } = this.props;
    const fielNames = this.state?.names?.map((name) => {
      return { label: name, value: name };
    });
    console.log(input);
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
              onChange={this.onModeChanged}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label width-8">Field name</div>
            <Select
              menuShouldPortal
              className="width-18"
              options={fielNames}
              value={fielNames?.find((v) => v.value === fieldName)}
              onChange={this.onFieldChanged}
            />
          </div>
        </div>
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
