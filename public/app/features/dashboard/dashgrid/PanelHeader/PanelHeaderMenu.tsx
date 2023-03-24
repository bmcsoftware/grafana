import React, { PureComponent } from 'react';

import { PanelMenuItem } from '@grafana/data';

import { PanelHeaderMenuItem } from './PanelHeaderMenuItem';

export interface Props {
  items: PanelMenuItem[];
}

export class PanelHeaderMenu extends PureComponent<Props> {
  renderItems = (menu: PanelMenuItem[], isSubMenu = false) => {
    return (
      <ul className="dropdown-menu dropdown-menu--menu panel-menu" role={isSubMenu ? '' : 'menu'}>
        {menu.map((menuItem, idx: number) => {
          return (
            <PanelHeaderMenuItem
              key={`${menuItem.text}${idx}`}
              type={menuItem.type}
              text={menuItem.text}
              iconClassName={menuItem.iconClassName}
              onClick={menuItem.onClick}
              shortcut={menuItem.shortcut}
            >
              {menuItem.subMenu && this.renderItems(menuItem.subMenu, true)}
            </PanelHeaderMenuItem>
          );
        })}
      </ul>
    );
  };

  render() {
    /*
    // @Copyright 2022 BMC Software, Inc.
    // Date - 12/20/2022
    // Show only view option for panel menu */
    // return <div className="panel-menu-container dropdown open">{this.renderItems(this.props.items)}</div>;
    const filteredItems = this.props.items.filter((item) => item.text === 'View');
    return <div className="panel-menu-container dropdown open">{this.renderItems(filteredItems)}</div>;
    // END
  }
}
