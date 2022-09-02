import { NavModel } from '@grafana/data';
import { getConfig } from 'app/core/config';
import { getNavModel } from 'app/core/selectors/navModel';
import { StoreState } from 'app/types';
import React, { PureComponent } from 'react';
import { connect, MapStateToProps } from 'react-redux';
import Page from '../Page/Page';

interface ConnectedProps {
  navModel: NavModel;
}

interface OwnProps {}

type Props = ConnectedProps;

export class ErrorPage extends PureComponent<Props> {
  render() {
    const { navModel } = this.props;
    const homePage = getConfig().appSubUrl + '/';
    return (
      <Page navModel={navModel}>
        <Page.Contents>
          <div className="bmc_error_container page-body">
            <div>
              <img src="public/img/bmc_page_not_found_icon.svg" />
            </div>
            <div>
              <h3 className="bmc_error_main_text">Oops... we could not load that page.</h3>
            </div>
            <div className="bmc_error_sub_text">
              <p>This page might have been removed, had its name changed, or is temporarily unavailable.</p>
              <p>
                Go back to the&nbsp;
                <a className="bmc_error_links" href={homePage}>
                  Home Page
                </a>
                , or contact&nbsp;
                <a className="bmc_error_links" href="https://www.bmc.com/support" target="_blank" rel="noreferrer">
                  BMC Support
                </a>
                .
              </p>
            </div>
          </div>
        </Page.Contents>
      </Page>
    );
  }
}

const mapStateToProps: MapStateToProps<ConnectedProps, OwnProps, StoreState> = (state) => {
  return {
    navModel: getNavModel(state.navIndex, 'not-found'),
  };
};

export default connect(mapStateToProps)(ErrorPage);
