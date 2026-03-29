import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const base = normalizeBase(env.VITE_BASE_PATH)

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
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
