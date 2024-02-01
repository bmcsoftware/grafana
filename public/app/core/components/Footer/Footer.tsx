import React from 'react';

import { LinkTarget } from '@grafana/data';
// import { config } from '@grafana/runtime';
import { Icon, IconName } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { customConfigSrv, DefaultCustomConfiguration } from 'app/features/org/state/configuration';

export interface FooterLink {
  target: LinkTarget;
  text: string;
  id: string;
  icon?: IconName;
  url?: string;
}

// BMC code - inline change
export let getFooterLinks = (config?: any): FooterLink[] => {
  return [
    {
      target: '_blank',
      id: 'documentation',
      text: t('nav.help/documentation', 'Documentation'),
      icon: 'document-info',
      // BMC code - inline change
      url: config?.docLink || DefaultCustomConfiguration.docLink,
    },
    {
      target: '_blank',
      id: 'support',
      text: t('nav.help/support', 'Support'),
      icon: 'question-circle',
      // BMC code - inline change
      url: config?.supportLink || DefaultCustomConfiguration.supportLink,
    },
    {
      target: '_blank',
      id: 'community',
      text: t('nav.help/community', 'Community'),
      icon: 'comments-alt',
      // BMC code - inline change
      url: config?.communityLink || DefaultCustomConfiguration.communityLink,
    },
  ];
};

export function getVersionMeta(version: string) {
  const isBeta = version.includes('-beta');

  return {
    hasReleaseNotes: true,
    isBeta,
  };
}

// BMC code
/*
//author(kmejdi)
export let getVersionLinks = (): FooterLink[] => {
  const { buildInfo, licenseInfo } = config;
  const links: FooterLink[] = [];
  const stateInfo = licenseInfo.stateInfo ? ` (${licenseInfo.stateInfo})` : '';

  links.push({
    target: '_blank',
    id: 'version',
    text: `${buildInfo.edition}${stateInfo}`,
    url: licenseInfo.licenseUrl,
  });

  if (buildInfo.hideVersion) {
    return links;
  }

  const { hasReleaseNotes } = getVersionMeta(buildInfo.version);

  links.push({
    target: '_blank',
    id: 'version',
    text: `v${buildInfo.version} (${buildInfo.commit})`,
    url: hasReleaseNotes ? `https://github.com/grafana/grafana/blob/main/CHANGELOG.md` : undefined,
  });

  if (buildInfo.hasUpdate) {
    links.push({
      target: '_blank',
      id: 'updateVersion',
      text: `New version available!`,
      icon: 'download-alt',
      url: 'https://grafana.com/grafana/download?utm_source=grafana_footer',
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

export interface Props {
  /** Link overrides to show specific links in the UI */
  customLinks?: FooterLink[] | null;
}

export const Footer = React.memo(({ customLinks }: Props) => {
  // BMC code
  // const links = (customLinks || getFooterLinks()).concat(getVersionLinks());
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
              <FooterItem item={link} />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

function FooterItem({ item }: { item: FooterLink }) {
  const content = item.url ? (
    <a href={item.url} target={item.target} rel="nofollow noopener noreferrer" id={item.id}>
      {item.text}
    </a>
  ) : (
    item.text
  );

  return (
    <>
      {item.icon && <Icon name={item.icon} />} {content}
    </>
  );
}
