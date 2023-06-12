import classnames from 'classnames';
import React, { PureComponent } from 'react';

import { PanelMenuItem } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Menu } from '@grafana/ui';

import { PanelHeaderMenuItem } from './PanelHeaderMenuItem';

export interface Props {
  items: PanelMenuItem[];
  style?: React.CSSProperties;
  itemsClassName?: string;
  className?: string;
}

export class PanelHeaderMenu extends PureComponent<Props> {
  renderItems = (menu: PanelMenuItem[], isSubMenu = false) => {
    return (
      <ul
        className={classnames('dropdown-menu', 'dropdown-menu--menu', 'panel-menu', this.props.itemsClassName)}
        style={this.props.style}
        role={isSubMenu ? '' : 'menu'}
      >
        {menu.map((menuItem, idx: number) => {
          return (
            <PanelHeaderMenuItem
              key={`${menuItem.text}${idx}`}
              type={menuItem.type}
              text={menuItem.text}
              iconClassName={menuItem.iconClassName}
              onClick={menuItem.onClick}
              shortcut={menuItem.shortcut}
              href={menuItem.href}
            >
              {menuItem.subMenu && this.renderItems(menuItem.subMenu, true)}
            </PanelHeaderMenuItem>
          );
        })}
      </ul>
    );
  };

  render() {
    // @Copyright 2023 BMC Software, Inc.
    // Date - 06/09/2023
    // Show only view option for panel menu
    const filteredItems = this.props.items.filter((item) => item.text === 'View');
    return (
      <div className={classnames('panel-menu-container', 'dropdown', 'open', this.props.className)}>
        {this.renderItems(filteredItems)}
      </div>
    );
    // END
  }
}

export function PanelHeaderMenuNew({ items }: Props) {
  const renderItems = (items: PanelMenuItem[]) => {
    return items.map((item) =>
      item.type === 'divider' ? (
        <Menu.Divider key={item.text} />
      ) : (
        <Menu.Item
          key={item.text}
          label={item.text}
          icon={item.iconClassName}
          childItems={item.subMenu ? renderItems(item.subMenu) : undefined}
          url={item.href}
          onClick={item.onClick}
          shortcut={item.shortcut}
          testId={selectors.components.Panels.Panel.menuItems(item.text)}
        />
      )
    );
  };

  return <Menu>{renderItems(items)}</Menu>;
}
