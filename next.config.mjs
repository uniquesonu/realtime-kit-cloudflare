import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@cloudflare/realtimekit-react$': path.join(
        process.cwd(),
        'node_modules/@cloudflare/realtimekit-react/dist/index.cjs.js',
      ),
      '@cloudflare/realtimekit-react-ui$': path.join(
        process.cwd(),
        'node_modules/@cloudflare/realtimekit-react-ui/dist/index.js',
      ),
      '@cloudflare/realtimekit$': path.join(
        process.cwd(),
        'node_modules/@cloudflare/realtimekit/dist/index.cjs.js',
      ),
    };

    return config;
  },
};

export default nextConfig;
