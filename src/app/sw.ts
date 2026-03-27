/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const OFFLINE_URL = '/offline'
const CACHE_VERSION = 'v1'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Static assets (JS, CSS, fonts, images) — Cache-First
    {
      matcher: /\.(?:js|css|woff2?|ttf|otf|eot)$/i,
      handler: new CacheFirst({
        cacheName: `${CACHE_VERSION}-static-assets`,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // Images — Cache-First with longer TTL
    {
      matcher: /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/i,
      handler: new CacheFirst({
        cacheName: `${CACHE_VERSION}-images`,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 256,
            maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
          }),
        ],
      }),
    },
    // API routes (match predictions, team stats) — Network-First
    {
      matcher: /^\/api\//,
      handler: new NetworkFirst({
        cacheName: `${CACHE_VERSION}-api`,
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 5 * 60, // 5 minutes
          }),
        ],
      }),
    },
    // Match/team page data — Stale-While-Revalidate
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/teams') ||
        url.pathname.startsWith('/matches') ||
        url.pathname.startsWith('/predictions') ||
        url.pathname.startsWith('/schedule'),
      handler: new StaleWhileRevalidate({
        cacheName: `${CACHE_VERSION}-match-data`,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 60 * 60, // 1 hour
          }),
        ],
      }),
    },
    // Google Fonts — StaleWhileRevalidate
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
      handler: new StaleWhileRevalidate({
        cacheName: `${CACHE_VERSION}-google-fonts`,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
  ],
  // Offline fallback: serve /offline for any failed navigation
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()

// ─── Web Push ────────────────────────────────────────────────────────────────

interface PushPayload {
  type: string
  title: string
  body: string
  url: string
  icon: string
  timestamp: number
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json() as PushPayload
  } catch {
    return
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.type,
    data: { url: payload.url ?? '/' },
    requireInteraction: payload.type === 'match_reminder',
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url: string = (event.notification.data as { url?: string })?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab at this URL if one exists
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return (client as WindowClient).focus()
          }
        }
        // Otherwise open a new tab
        return self.clients.openWindow(url)
      }),
  )
})
