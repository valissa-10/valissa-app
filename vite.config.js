import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
                            VitePWA({
                              registerType: 'autoUpdate',
                              includeAssets: ['logo.jpg', 'favicon.ico', 'robots.txt'],
                              manifest: {
                                name: 'Valissa — Diseño y Costura Infantil',
                                short_name: 'Valissa',
                                description: 'Moda infantil exclusiva, conjuntos, pijamas y sublimación',
                                theme_color: '#49c5d1',
                                background_color: '#ffffff',
                                display: 'standalone',
                                start_url: '/',
                                icons: [
                                  {
                                    src: '/logo.jpg',
                                    sizes: '192x192',
                                    type: 'image/jpeg'
                                  },
                                  {
                                    src: '/logo.jpg',
                                    sizes: '512x512',
                                    type: 'image/jpeg'
                                  }
                                ]
                              }
                            })
  ]
})
