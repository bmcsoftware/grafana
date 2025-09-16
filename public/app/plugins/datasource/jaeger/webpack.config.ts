import { createRequire } from 'node:module';

// @Copyright 2025 BMC Software, Inc.
// Date - 09/15/2025
// import Env type
import config, { type Env } from '@grafana/plugin-configs/webpack.config.ts';
// END

const require = createRequire(import.meta.url);

// @Copyright 2025 BMC Software, Inc.
// Date - 09/15/2025
// Updated parameter type
const configWithFallback = async (env: Env) => {
// END
  const response = await config(env);
  if (response !== undefined && response.resolve !== undefined) {
    response.resolve.fallback = {
      ...response.resolve.fallback,
      stream: require.resolve('stream-browserify'),
    };
  }
  return response;
};

export default configWithFallback;
