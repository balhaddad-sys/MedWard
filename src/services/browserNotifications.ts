/**
 * Browser Notification Service
 * Manages browser notification permissions and delivery
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default'

export interface BrowserNotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
}

/**
 * Check if browser notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (!isNotificationSupported()) {
    console.warn('Browser notifications not supported')
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Failed to request notification permission:', error)
    return 'denied'
  }
}

/**
 * Show a browser notification
 */
export const showNotification = async (options: BrowserNotificationOptions): Promise<boolean> => {
  const permission = getNotificationPermission()

  if (permission !== 'granted') {
    console.warn('Notification permission not granted')
    return false
  }

  try {
    // Redact clinical content from lock-screen / shared-workstation notifications.
    // Full detail is available only inside the authenticated app.
    const notification = new Notification('MedWard — New alert', {
      body: 'Open MedWard to view details.',
      icon: options.icon || '/icons/icon-192x192.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? true,
      silent: options.silent ?? false,
      badge: '/icons/icon-96x96.png',
    })

    // Auto-close after 10 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000)
    }

    return true
  } catch (error) {
    console.error('Failed to show notification:', error)
    return false
  }
}

/**
 * Check if notification permission has been previously requested
 */
export const hasRequestedPermission = (): boolean => {
  return localStorage.getItem('notification-permission-requested') === 'true'
}

/**
 * Mark that notification permission has been requested
 */
export const markPermissionRequested = (): void => {
  localStorage.setItem('notification-permission-requested', 'true')
}

/**
 * Clear permission request tracking (for testing)
 */
export const clearPermissionTracking = (): void => {
  localStorage.removeItem('notification-permission-requested')
}
