import { PanelPlugin } from '@grafana/data';
import { BMCWelcomeBanner } from './BMCWelcome';

export const plugin = new PanelPlugin(BMCWelcomeBanner).setNoPadding();
