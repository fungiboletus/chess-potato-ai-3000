import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const DEFAULT_SITE_URL = 'https://fungiboletus.github.io/chess-potato-ai-3000/'

function normalizeBase(rawBase: string | undefined): string {
  const base = rawBase?.trim()

  if (!base) {
    return '/'
  }

  if (base === './' || base === '../') {
    return base
  }

  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function joinBase(base: string, assetPath: string): string {
  if (base === './' || base === '../') {
    return `${base}${assetPath}`
  }

  return `${base}${assetPath}`
}

function normalizeSiteUrl(rawSiteUrl: string | undefined): string {
  const siteUrl = rawSiteUrl?.trim() || DEFAULT_SITE_URL
  return siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
}

function toAbsoluteAssetUrl(siteUrl: string, assetPath: string): string {
  return `${siteUrl}${assetPath.replace(/^\//, '')}`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const base = normalizeBase(env.VITE_BASE_PATH)
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL)
  const ogImageUrl = toAbsoluteAssetUrl(siteUrl, 'social-preview.webp')

  return {
    base,
    plugins: [
      {
        name: 'inject-social-meta-urls',
        transformIndexHtml(html) {
          return html.replaceAll('%VITE_OG_IMAGE_URL%', ogImageUrl)
        },
      },
      react(),
      VitePWA({
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        workbox: {
          navigateFallbackDenylist: [
            /\/article(?:\/.*)?$/,
          ],
        },
        manifest: {
          name: 'Chess Potato AI 3000',
          short_name: 'CPAI 3000',
          description: 'Another chess game.',
          start_url: base,
          scope: base,
          theme_color: '#008080',
          background_color: '#008080',
          display: 'standalone',
          icons: [
            {
              src: joinBase(base, 'icon-192.png'),
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: joinBase(base, 'icon-512.png'),
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: joinBase(base, 'icon-512.png'),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
  }
})
