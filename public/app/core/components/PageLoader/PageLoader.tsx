import React from 'react';

import { LoadingPlaceholder } from '@grafana/ui';
import { t } from 'app/core/internationalization';

interface Props {
  pageName?: string;
}

const PageLoader = ({ pageName = '' }: Props) => {
  // BMC code - added support for localization
  const loadingText = `${t('bmcgrafana.page-loader.text', 'Loading')} ${pageName}...`;
  return (
    <div className="page-loader-wrapper">
      <LoadingPlaceholder text={loadingText} />
    </div>
  );
};

export default PageLoader;
