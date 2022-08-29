import { PanelPlugin } from '@grafana/data';
import { BMCWelcomeBanner } from './BMCWelcome';
import { Options } from './types';
import { defaultDescr } from './cards';

export const plugin = new PanelPlugin<Options>(BMCWelcomeBanner).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      name: 'Documentation description',
      defaultValue: defaultDescr.doc,
      path: 'descr.doc',
    })
    .addTextInput({
      name: 'Video description',
      defaultValue: defaultDescr.video,
      path: 'descr.video',
    })
    .addTextInput({
      name: 'Community description',
      defaultValue: defaultDescr.community,
      path: 'descr.community',
    });
});
