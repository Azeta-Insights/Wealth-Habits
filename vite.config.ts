import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'vite-hmr-suppressor',
      transformIndexHtml: {
        order: 'pre',
        handler() {
          return [
            {
              tag: 'script',
              injectTo: 'head-prepend',
              children: `
(function() {
  if (typeof window === 'undefined') return;
  const OrigWS = window.WebSocket;
  if (OrigWS) {
    class FakeHmrSocket extends EventTarget {
      constructor() {
        super();
        this.readyState = 1;
        this.OPEN = 1;
        this.CLOSED = 3;
        this.CLOSING = 2;
        this.CONNECTING = 0;
        this.binaryType = 'blob';
        this.bufferedAmount = 0;
        this.extensions = '';
        this.protocol = 'vite-hmr';
        this.url = '';
        this.onopen = null;
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
      }
      send() {}
      close() { this.readyState = 3; }
    }
    FakeHmrSocket.CONNECTING = 0;
    FakeHmrSocket.OPEN = 1;
    FakeHmrSocket.CLOSING = 2;
    FakeHmrSocket.CLOSED = 3;

    window.WebSocket = function(url, protocols) {
      if (
        protocols === 'vite-hmr' ||
        (Array.isArray(protocols) && protocols.includes('vite-hmr')) ||
        (typeof url === 'string' && (url.includes('vite-hmr') || url.includes('token=')))
      ) {
        const sock = new FakeHmrSocket();
        sock.url = String(url || '');
        return sock;
      }
      return new OrigWS(url, protocols);
    };
    window.WebSocket.CONNECTING = 0;
    window.WebSocket.OPEN = 1;
    window.WebSocket.CLOSING = 2;
    window.WebSocket.CLOSED = 3;
    window.WebSocket.prototype = OrigWS.prototype;
  }

  const _origConsoleError = console.error;
  console.error = function(...args) {
    const str = args.map(a => (a && (a.stack || a.message)) || String(a)).join(' ');
    if (str.includes('WebSocket') && (str.includes('[vite]') || str.includes('closed without opened'))) {
      return;
    }
    _origConsoleError.apply(console, args);
  };
  window.addEventListener('error', function(e) {
    const msg = (e && (e.message || (e.error && (e.error.message || e.error.stack)))) || '';
    if (msg.includes('WebSocket') && (msg.includes('closed without opened') || msg.includes('[vite]'))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    const reason = (e && (e.reason?.message || e.reason?.stack || String(e.reason))) || '';
    if (reason.includes('WebSocket') && (reason.includes('closed without opened') || reason.includes('[vite]'))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
})();
`
            }
          ];
        }
      }
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: '/',
        name: 'Wealth Habits — Nigerian Bank Insights',
        short_name: 'WealthHabits',
        description: 'Privacy-first personal finance insights from Nigerian bank alerts & statements with Need vs. Want reflections.',
        theme_color: '#3D5A45',
        background_color: '#FDFBF7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: false
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdfjs-dist'],
          'excel-vendor': ['xlsx']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
