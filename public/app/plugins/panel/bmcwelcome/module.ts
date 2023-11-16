import { PanelPlugin } from '@grafana/data';
import { t } from 'app/core/internationalization';

import { BMCWelcomeBanner } from './BMCWelcome';
import { defaultDescr } from './cards';
import { Options } from './types';

export const plugin = new PanelPlugin<Options>(BMCWelcomeBanner).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      name: t('bmc.panel.bmc-welcome.documentation-description', 'Documentation description'),
      defaultValue: defaultDescr.doc,
      path: 'descr.doc',
    })
    .addTextInput({
      name: t('bmc.panel.bmc-welcome.video-description', 'Video description'),
      defaultValue: defaultDescr.video,
      path: 'descr.video',
    })
    .addTextInput({
      name: t('bmc.panel.bmc-welcome.community-description', 'Community description'),
      defaultValue: defaultDescr.community,
      path: 'descr.community',
    });
});
