#!/usr/bin/env node
/**
 * Generate VAPID key pair for Web Push notifications.
 * Run: node scripts/generate-vapid-keys.mjs
 *
 * Copy the output into your .env.local file.
 */

import webpush from 'web-push'

const vapidKeys = webpush.generateVAPIDKeys()

console.log('Add these to your .env.local:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:push@scoutedge.com`)
