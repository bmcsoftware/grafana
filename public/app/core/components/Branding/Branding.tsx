import { css, cx } from '@emotion/css';
import React, { FC } from 'react';

import { colorManipulator } from '@grafana/data';
import { useTheme2, styleMixins } from '@grafana/ui';

export interface BrandComponentProps {
  className?: string;
  children?: JSX.Element | JSX.Element[];
}

export const LoginLogo: FC<BrandComponentProps & { logo?: string }> = ({ className, logo }) => {
  // @Copyright 2023 BMC Software, Inc.
  // Date - 06/09/2023
  // Replaced with bmc icon
  return <img className={className} src={`${logo ? logo : 'public/img/dashboard_icon.svg'}`} alt="Dashboard" />;
  // END
};

const LoginBackground: FC<BrandComponentProps> = ({ className, children }) => {
  const theme = useTheme2();

  const background = css`
    &:before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      top: 0;
      background: url(public/img/g8_login_${theme.isDark ? 'dark' : 'light'}.svg);
      background-position: top center;
      background-size: auto;
      background-repeat: no-repeat;

      opacity: 0;
      transition: opacity 3s ease-in-out;

      @media ${styleMixins.mediaUp(theme.v1.breakpoints.md)} {
        background-position: center;
        background-size: cover;
      }
    }
  `;

  return <div className={cx(background, className)}>{children}</div>;
};

const MenuLogo: FC<BrandComponentProps> = ({ className }) => {
  // @Copyright 2023 BMC Software, Inc.
  // Date - 06/09/2023
  // Replaced with bmc icon
  return <img className={className} src="public/img/dashboard_icon.svg" alt="Dashboard" />;
  // END
};

const LoginBoxBackground = () => {
  const theme = useTheme2();
  return css`
    background: ${colorManipulator.alpha(theme.colors.background.primary, 0.7)};
    background-size: cover;
  `;
};

export class Branding {
  static LoginLogo = LoginLogo;
  static LoginBackground = LoginBackground;
  static MenuLogo = MenuLogo;
  static LoginBoxBackground = LoginBoxBackground;
  // @Copyright 2023 BMC Software, Inc.
  // Date - 06/09/2023
  // Replaced text Grafana with Dashboard
  static AppTitle = 'AMI Dashboard';
  static LoginTitle = 'Welcome to AMI Dashboard';
  // END
  static GetLoginSubTitle = (): null | string => {
    return null;
  };
}
