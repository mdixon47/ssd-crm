// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
  ],

  supabase: {
    // Redirect is disabled — we handle auth manually if needed
    redirect: false,
  },

  runtimeConfig: {
    // Server-only secrets
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',

    // Public (exposed to client)
    public: {
      appName: 'SSD Consulting CRM',
      mcpBaseUrl: process.env.MCP_BASE_URL || '/api/mcp',
    },
  },

  nitro: {
    // Deployment preset — override via NITRO_PRESET env (e.g. set in netlify.toml).
    // Defaults to Vercel.
    preset: process.env.NITRO_PRESET || 'vercel',
    // Allow streaming for MCP SSE endpoints
    experimental: {
      asyncContext: true,
    },
  },

  // ── Security headers ────────────────────────────────────────
  // Applied by Nitro to every response. CSP is intentionally
  // strict; relax 'connect-src' if you add new third-party APIs.
  routeRules: {
    '/**': {
      headers: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    },
  },

  typescript: {
    strict: true,
    // typeCheck runs vue-tsc concurrently with Vite and doubles peak heap usage.
    // Run type checking separately (npm run typecheck) rather than during build.
    typeCheck: false,
  },

  vite: {
    build: {
      // Source maps are the biggest single memory consumer in Rollup — skip in prod.
      sourcemap: false,
      // Skips the gzip/brotli size estimation pass (saves ~200 MB peak heap).
      reportCompressedSize: false,
    },
  },

  tailwindcss: {
    config: {
      theme: {
        extend: {
          colors: {
            primary: {
              DEFAULT: '#0b1120',
              light: '#111d35',
              50: '#f0f5ff',
              100: '#dce8f8',
            },
            accent: {
              DEFAULT: '#06b6d4',
              light: '#22d3ee',
            },
            fb: '#1877F2',
            ig: '#E1306C',
            li: '#0A66C2',
          },
        },
      },
    },
  },

  app: {
    head: {
      title: 'SSD Consulting — Paid Acquisition CRM',
      meta: [
        { name: 'description', content: 'Google Ads + Social Media CRM with Claude AI Agents' },
      ],
    },
  },
})
