import React, { FC } from 'react';

// import { config } from '@grafana/runtime';
import { Icon, IconName } from '@grafana/ui';
import { customConfigSrv, DefaultCustomConfiguration } from 'app/features/org/state/configuration';

export interface FooterLink {
  text: string;
  id?: string;
  icon?: IconName;
  url?: string;
  target?: string;
}

// BMC code - inline change
export let getFooterLinks = (config?: any): FooterLink[] => {
  return [
    {
      text: 'Documentation',
      icon: 'document-info',
      // BMC code - inline change
      url: config?.docLink || DefaultCustomConfiguration.docLink,
      target: '_blank',
    },
    {
      text: 'Support',
      icon: 'question-circle',
      // BMC code - inline change
      url: config?.supportLink || DefaultCustomConfiguration.supportLink,
      target: '_blank',
    },
    {
      text: 'Community',
      icon: 'comments-alt',
      // BMC code - inline change
      url: config?.communityLink || DefaultCustomConfiguration.communityLink,
      target: '_blank',
    },
  ];
};

// BMC code
/*
//author(kmejdi)
export let getVersionLinks = (): FooterLink[] => {
  const { buildInfo, licenseInfo } = config;
  const links: FooterLink[] = [];
  const stateInfo = licenseInfo.stateInfo ? ` (${licenseInfo.stateInfo})` : '';

  links.push({ text: `${buildInfo.edition}${stateInfo}`, url: licenseInfo.licenseUrl });

  if (buildInfo.hideVersion) {
    return links;
  }

  links.push({ text: `v${buildInfo.version} (${buildInfo.commit})` });

  if (buildInfo.hasUpdate) {
    links.push({
      id: 'updateVersion',
      text: `New version available!`,
      icon: 'download-alt',
      url: 'https://grafana.com/grafana/download?utm_source=grafana_footer',
      target: '_blank',
    });
  }

  return links;
};
//author(kmejdi) - End
*/

//author(kmejdi) - Start
//Update footer links
export let getVersionLinks = (): FooterLink[] => {
  return [];
};
//author(kmejdi) - End
// End

export function setFooterLinksFn(fn: typeof getFooterLinks) {
  getFooterLinks = fn;
}

export function setVersionLinkFn(fn: typeof getFooterLinks) {
  getVersionLinks = fn;
}

export const Footer: FC = React.memo(() => {
  // BMC code
  // const links = getFooterLinks().concat(getVersionLinks());
  const [links, setLinks] = React.useState<FooterLink[]>(() => getFooterLinks());
  React.useEffect(() => {
    customConfigSrv.getCustomConfiguration().then((data) => {
      const footerLinks = getFooterLinks(data).concat(getVersionLinks());
      setLinks(footerLinks);
    });
  }, []);
  // End

  return (
    <footer className="footer">
      <div className="text-center">
        <ul>
          {links.map((link) => (
            <li key={link.text}>
              <a href={link.url} target={link.target} rel="noopener" id={link.id}>
                {link.icon && <Icon name={link.icon} />} {link.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
