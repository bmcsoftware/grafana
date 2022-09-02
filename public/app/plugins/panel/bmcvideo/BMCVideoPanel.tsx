import React, { PureComponent } from 'react';
import { PanelProps, textUtil } from '@grafana/data';

import { VideoOptions } from './types';

interface Props extends PanelProps<VideoOptions> {}

export class BMCVideoPanel extends PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    const url = textUtil.sanitizeUrl(this.props.options.url);

    return (
      <div>
        <iframe
          src={url}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="BMC Helix Dashboards"
        />
      </div>
    );
  }
}
