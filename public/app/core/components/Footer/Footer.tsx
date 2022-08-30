import React, { FC } from 'react';
import { Icon, IconName } from '@grafana/ui';
import { customConfigSrv, DefaultCustomConfiguration } from 'app/features/org/state/configuration';

export interface FooterLink {
  text: string;
  id?: string;
  icon?: string;
  url?: string;
  target?: string;
}

export let getFooterLinks = (config?: any): FooterLink[] => {
  return [
    {
      text: 'Documentation',
      icon: 'document-info',
      url: config?.docLink || DefaultCustomConfiguration.docLink,
      target: '_blank',
    },
    {
      text: 'Support',
      icon: 'question-circle',
      url: config?.supportLink || DefaultCustomConfiguration.supportLink,
      target: '_blank',
    },
    {
      text: 'Community',
      icon: 'comments-alt',
      url: config?.communityLink || DefaultCustomConfiguration.communityLink,
      target: '_blank',
    },
  ];
};

export let getVersionLinks = (): FooterLink[] => {
  const links: FooterLink[] = [];

  return links;
};

export function setFooterLinksFn(fn: typeof getFooterLinks) {
  getFooterLinks = fn;
}

export function setVersionLinkFn(fn: typeof getFooterLinks) {
  getVersionLinks = fn;
}

export const Footer: FC = React.memo(() => {
  // const links = getFooterLinks().concat(getVersionLinks());

  // BMC code - begin
  const [links, setLinks] = React.useState<FooterLink[]>(() => getFooterLinks());
  React.useEffect(() => {
    customConfigSrv.getCustomConfiguration().then((data) => {
      const footerLinks = getFooterLinks(data).concat(getVersionLinks());
      setLinks(footerLinks);
    });
  }, []);
  // BMC code - end

  return (
    <footer className="footer">
      <div className="text-center">
        <ul>
          {links.map((link) => (
            <li key={link.text}>
              <a href={link.url} target={link.target} rel="noopener" id={link.id}>
                {link.icon && <Icon name={link.icon as IconName} />} {link.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
