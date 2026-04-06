import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Path alias @/ → ./src/
  // Will be used by next dev/build alongside tsconfig.json
  webpack: (config, { webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };

    // Replace Vite-style import.meta.env.VITE_* references with Next.js env vars.
    // Used when building with --webpack flag. For Turbopack builds, see `turbopack.define` below.
    config.plugins.push(
      new webpack.DefinePlugin({
        'import.meta.env.VITE_SUPABASE_URL':
          JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY':
          JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
        'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY':
          JSON.stringify(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''),
        'import.meta.env.VITE_SITE_URL':
          JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.hawaiiwellness.net'),
        'import.meta.env.VITE_USE_NEW_SEARCH':
          JSON.stringify(process.env.NEXT_PUBLIC_USE_NEW_SEARCH ?? 'true'),
        'import.meta.env.VITE_BETA_SECRET':
          JSON.stringify(process.env.NEXT_PUBLIC_BETA_SECRET ?? ''),
        'import.meta.env.VITE_PROMO_ACTIVE':
          JSON.stringify(process.env.NEXT_PUBLIC_PROMO_ACTIVE ?? 'false'),
        'import.meta.env.DEV':
          JSON.stringify(process.env.NODE_ENV === 'development'),
      })
    );

    return config;
  },

  // Turbopack (default in Next.js 16+): path alias for @/ → src/
  // Note: import.meta.env.VITE_* compat is handled via optional chaining
  // in src/lib/supabase.ts and src/lib/siteConfig.ts rather than turbopack.define,
  // since 'define' is not a valid turbopack config key in Next.js 16.
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Image optimization: allow Supabase storage domain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // TypeScript: strict mode
  typescript: {
    tsconfigPath: './tsconfig.json',
  },

  // Allow trailing slashes for consistency with Vite-based routes
  trailingSlash: false,

  // Disable optimized font loading for now; we'll handle fonts in layout.tsx
  // if needed

  // Fallback rewrites: routes not matched by App Router pages or public/ static
  // files fall through to the Vite SPA shell (copied during build).
  async rewrites() {
    return {
      fallback: [
        { source: '/:path*', destination: '/_spa.html' },
      ],
    };
  },
};

export default nextConfig;
