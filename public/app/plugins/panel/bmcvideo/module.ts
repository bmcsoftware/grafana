import { PanelPlugin, PanelModel } from '@grafana/data';

import { BMCVideoPanel } from './BMCVideoPanel';
import { VideoOptions } from './types';

export const plugin = new PanelPlugin<VideoOptions>(BMCVideoPanel)
  .setPanelOptions((builder) => {
    builder.addTextInput({
      path: 'url',
      name: 'Video URL',
      settings: {
        placeholder: 'Enter embded video',
      },
    });
  })
  .setPanelChangeHandler((panel: PanelModel<VideoOptions>, prevPluginId: string, prevOptions: any) => {
    if (prevPluginId === 'text') {
      return prevOptions as VideoOptions;
    }
    return panel.options;
  });
