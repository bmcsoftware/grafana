import React, { ChangeEvent, KeyboardEvent, FC, useState } from 'react';
import { css } from '@emotion/css';
import { Button, useStyles, Input, Field } from '@grafana/ui';
import { CustomTagItem } from './CustomTagItem';
import { GrafanaTheme } from '@grafana/data';

export interface Props {
  placeholder?: string;
  onValidate: (_: string) => string | undefined | null;
  tags?: string[];
  onChange: (tags: string[]) => void;
}

export const CustomTagsInput: FC<Props> = ({
  placeholder = 'New tag (enter key to add)',
  onValidate,
  tags = [],
  onChange,
}) => {
  const [newTagName, setNewName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | undefined | null>(undefined);
  const styles = useStyles(getStyles);

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewName(event.target.value);
  };

  const onRemove = (tagToRemove: string) => {
    onChange(tags?.filter((x) => x !== tagToRemove));
  };

  const onAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    onError(newTagName);
    onChange(tags.concat(newTagName));
    setNewName('');
  };

  const onKeyboardAdd = (event: KeyboardEvent) => {
    event.preventDefault();
    if (event.key === 'Enter' && newTagName !== '') {
      onError(newTagName);
      onChange(tags.concat(newTagName));
      setNewName('');
    }
  };

  const onError = (newTagName: any) => {
    let error = onValidate(newTagName);
    setErrorMsg(error);
  };

  return (
    <div>
      <Field invalid={!!errorMsg} error={errorMsg}>
        <Input
          placeholder={placeholder}
          onChange={onNameChange}
          value={newTagName}
          onKeyUp={onKeyboardAdd}
          onBlur={() => setErrorMsg(undefined)}
          suffix={
            <Button
              variant="link"
              className={styles.addButtonStyle}
              onClick={onAdd}
              size="md"
              disabled={newTagName.length === 0}
            >
              Add
            </Button>
          }
        />
      </Field>
      <div className={styles.tags}>
        {tags?.map((tag: string, index: number) => {
          return <CustomTagItem key={`${tag}-${index}`} name={tag} onRemove={onRemove} />;
        })}
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme) => ({
  wrapper: css`
    height: ${theme.spacing.formInputHeight}px;
    display: block;
  `,
  tags: css`
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-right: ${theme.spacing.xs};
  `,
  addButtonStyle: css`
    margin: 0 -${theme.spacing.sm};
  `,
});
