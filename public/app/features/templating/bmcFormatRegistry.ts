import { isArray, map, replace } from 'lodash';

import { formatRegistry } from '@grafana/scenes';
import { VariableFormatID } from '@grafana/schema';

formatRegistry.register({
  id: VariableFormatID.Base64,
  name: 'base64',
  description: 'Convert the value in base64 encoding',
  formatter: (value) => {
    if (typeof value === 'string') {
      return btoa(value);
    }
    return `${value}`;
  },
});
formatRegistry.register({
  id: VariableFormatID.BMCSingleQuote,
  name: 'BMC Single quote',
  description: 'BMC Single quoted values',
  formatter: (value) => {
    // escape single quotes with backslash
    const regExp = new RegExp(`'"`, 'g');

    if (isArray(value)) {
      return map(value, (v: string) => `'${replace(v, regExp, `\\$&`)}'`).join(',');
    }

    let strVal = typeof value === 'string' ? value : String(value);
    return `'${replace(strVal, regExp, `\\$&`)}'`;
  },
});

export { formatRegistry };
