import { css } from '@emotion/css';
import React, { FC, memo } from 'react';

import { Checkbox, stylesFactory } from '@grafana/ui';

interface Props {
  checked?: boolean;
  onClick: any;
  editable?: boolean;
}

export const SearchCheckbox: FC<Props> = memo(({ onClick, checked = false, editable = false }) => {
  const styles = getStyles();

  return editable ? (
    <div onClick={onClick} className={styles.wrapper}>
      <Checkbox value={checked} />
    </div>
  ) : null;
});
SearchCheckbox.displayName = 'SearchCheckbox';

const getStyles = stylesFactory(() => ({
  // Vertically align absolutely positioned checkbox element
  wrapper: css`
    display: flex;
    height: 21px;
    margin-right: 12px;
    & > label {
      height: 100%;
    }
  `,
}));
