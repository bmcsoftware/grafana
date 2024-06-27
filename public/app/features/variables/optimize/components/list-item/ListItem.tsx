// BMC code starts
import { css, cx } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { HorizontalGroup, Icon, IconName, Label, styleMixins, stylesFactory, useTheme2 } from '@grafana/ui';

export interface ListItemProps {
  item: SelectableValue;
  onClick: (item: SelectableValue) => void;
  onItemDrillDown?: (selected: SelectableValue) => void;
  iconName: IconName;
  iconTooltip?: string;
}
export const ListItem: React.FC<ListItemProps> = (props: ListItemProps) => {
  const theme = useTheme2();
  const styles = getResultsItemStyles(theme);

  return (
    <>
      <div className={cx(styles.wrapper)} style={{ width: '100%', padding: '8px' }}>
        <HorizontalGroup justify="space-between">
          <div
            style={{
              cursor: props.item.hasChildren && props.onItemDrillDown ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => {
              if (props.item.hasChildren && props.onItemDrillDown) {
                props.onItemDrillDown(props.item);
              }
            }}
          >
            <Label
              description={props.item.description}
              style={{ cursor: props.item.hasChildren && props.onItemDrillDown ? 'pointer' : 'default' }}
            >
              {props.item.label}
            </Label>
            {props.item.hasChildren && <Icon name={'angle-right'} size={'xxl'} />}
          </div>
          {
            <Icon
              name={props.item.selected ? 'minus-circle' : props.iconName}
              title={props.item.selected ? 'Remove item' : props.iconTooltip}
              onClick={() => props.onClick(props.item)}
              style={{ cursor: 'pointer' }}
            />
          }
        </HorizontalGroup>
      </div>
    </>
  );
};

const getResultsItemStyles = stylesFactory((theme: GrafanaTheme2) => ({
  wrapper: css`
    ${styleMixins.listItem(theme)};
  `,
}));
//BMC code ends
