import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
// @Copyright 2025 BMC Software, Inc.
// Date - 09/15/2025
// import Env type
import grafanaConfig, { type Env } from '@grafana/plugin-configs/webpack.config.ts';
// END


// @Copyright 2025 BMC Software, Inc.
// Date - 09/15/2025
// Updated parameter type
const config = async (env: Env): Promise<Configuration> => {
// END
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    externals: ['i18next'],
  });
};

export default config;
