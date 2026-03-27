'use client'

import { usePushNotifications, type NotificationType } from '@/hooks/usePushNotifications'

interface NotificationOption {
  key: NotificationType
  label: string
  description: string
  icon: string
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: 'match_reminder',
    label: 'Match Reminders',
    description: '30 minutes before kick-off',
    icon: '⚽',
  },
  {
    key: 'prediction_update',
    label: 'Prediction Updates',
    description: 'When win probabilities shift significantly',
    icon: '📊',
  },
  {
    key: 'daily_brief',
    label: 'Daily Brief',
    description: 'Morning roundup of the day\'s matches',
    icon: '☀️',
  },
  {
    key: 'breaking_news',
    label: 'Breaking News',
    description: 'Injuries, lineup changes, and major news',
    icon: '🚨',
  },
]

export default function NotificationPreferences() {
  const {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    loading,
    error,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = usePushNotifications()

  if (!isSupported) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant p-4 text-sm text-on-surface-variant">
        Push notifications are not supported in this browser.
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant p-4 text-sm text-on-surface-variant">
        Notifications are blocked. Enable them in your browser settings to receive match alerts.
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-outline-variant">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Push Notifications</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isSubscribed ? 'Managing your alerts' : 'Stay up to date with World Cup alerts'}
          </p>
        </div>

        {/* Subscribe / Unsubscribe toggle */}
        <button
          onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
          disabled={loading}
          className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
            focus-visible:ring-primary focus-visible:ring-offset-2
            ${isSubscribed ? 'bg-primary' : 'bg-surface-container-highest'}
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          role="switch"
          aria-checked={isSubscribed}
          aria-label={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
              ring-0 transition-transform duration-200 ease-in-out
              ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-error/10 border-b border-error/20">
          <p className="text-xs text-error">{error}</p>
        </div>
      )}

      {/* Notification type toggles — shown when subscribed */}
      {isSubscribed && preferences && (
        <ul className="divide-y divide-outline-variant">
          {NOTIFICATION_OPTIONS.map(({ key, label, description, icon }) => {
            const enabled = preferences[key] ?? true
            return (
              <li key={key} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg leading-none w-6 text-center" aria-hidden="true">
                  {icon}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface leading-tight">{label}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
                </div>

                <button
                  onClick={() => updatePreferences({ [key]: !enabled })}
                  disabled={loading}
                  className={`
                    relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                    transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
                    focus-visible:ring-primary focus-visible:ring-offset-2
                    ${enabled ? 'bg-primary' : 'bg-surface-container-highest'}
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${enabled ? 'Disable' : 'Enable'} ${label}`}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                      ring-0 transition-transform duration-200 ease-in-out
                      ${enabled ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* CTA when not subscribed */}
      {!isSubscribed && (
        <div className="p-4">
          <ul className="space-y-1.5 mb-4">
            {NOTIFICATION_OPTIONS.map(({ icon, label, description }) => (
              <li key={label} className="flex items-start gap-2 text-xs text-on-surface-variant">
                <span className="leading-none mt-0.5" aria-hidden="true">{icon}</span>
                <span>
                  <span className="font-medium text-on-surface">{label}</span>
                  {' — '}
                  {description}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => subscribe()}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enabling…' : 'Enable Notifications'}
          </button>
        </div>
      )}
    </div>
  )
}
