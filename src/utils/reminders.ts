/**
 * Gentle Evening Cash & POS Check-In Reminders Utility
 * Uses native browser Notification API + Service Worker fallback.
 * Stores preferences locally to respect privacy.
 */

const REMINDER_ENABLED_KEY = 'wealth_habits_reminder_enabled';
const REMINDER_TIME_KEY = 'wealth_habits_reminder_time';
const LAST_REMINDED_DATE_KEY = 'wealth_habits_last_reminded_date';

export const DEFAULT_REMINDER_TIME = '20:00'; // 8:00 PM

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function isReminderEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  return localStorage.getItem(REMINDER_ENABLED_KEY) === 'true' && Notification.permission === 'granted';
}

export function setReminderEnabled(enabled: boolean): void {
  localStorage.setItem(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function getReminderTime(): string {
  return localStorage.getItem(REMINDER_TIME_KEY) || DEFAULT_REMINDER_TIME;
}

export function setReminderTime(time: string): void {
  localStorage.setItem(REMINDER_TIME_KEY, time);
}

export function getLastRemindedDate(): string | null {
  return localStorage.getItem(LAST_REMINDED_DATE_KEY);
}

export function setLastRemindedDate(dateStr: string): void {
  localStorage.setItem(LAST_REMINDED_DATE_KEY, dateStr);
}

/**
 * Request notification permission from browser
 */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    if (granted) {
      setReminderEnabled(true);
    }
    return granted;
  } catch (err) {
    console.error('Failed to request notification permission', err);
    return false;
  }
}

/**
 * Trigger a native notification via Service Worker or window.Notification
 */
async function dispatchNotification(
  title: string,
  body: string,
  onClick?: () => void
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'wealth-habits-evening-checkin',
    requireInteraction: false
  };

  try {
    // Attempt Service Worker registration if active
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // Direct Notification fallback
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn('Falling back to direct window notification', err);
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notification.close();
      };
      return true;
    } catch (innerErr) {
      console.error('Failed to display notification', innerErr);
      return false;
    }
  }
}

/**
 * Send a quick test notification so the user can verify styling and sound
 */
export async function sendTestReminder(onClick?: () => void): Promise<{ success: boolean; error?: string }> {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Notifications are not supported in this browser.' };
  }

  if (Notification.permission === 'default') {
    const granted = await requestReminderPermission();
    if (!granted) {
      return { success: false, error: 'Notification permission was not granted.' };
    }
  } else if (Notification.permission === 'denied') {
    return {
      success: false,
      error: 'Notifications are blocked in your browser settings. Please enable notifications for this site.'
    };
  }

  const sent = await dispatchNotification(
    'Evening Rhythm Check 🌱',
    'Quick check: Any cash, keke, or POS spends to log from today? Tap to record in 3 seconds.',
    onClick
  );

  return sent
    ? { success: true }
    : { success: false, error: 'Could not display notification.' };
}

/**
 * Check if the evening reminder should fire right now
 */
export async function checkAndTriggerEveningReminder(onNavigateToAdd?: () => void): Promise<boolean> {
  if (!isReminderEnabled()) return false;

  // Format today's local date as YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const lastDate = getLastRemindedDate();
  if (lastDate === todayStr) {
    return false; // Already reminded today
  }

  // Parse reminder time (e.g. "20:00")
  const reminderTime = getReminderTime();
  const [targetH, targetM] = reminderTime.split(':').map(val => parseInt(val, 10) || 0);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetH * 60 + targetM;

  // Only fire once after chosen time
  if (currentMinutes >= targetMinutes) {
    setLastRemindedDate(todayStr);
    return dispatchNotification(
      'Evening Rhythm Check 🌱',
      'Quick check: Any cash, keke, or POS spends to log from today? Tap to record in 3 seconds.',
      onNavigateToAdd
    );
  }

  return false;
}

/**
 * Hook/Initializer for App.tsx: checks periodically and on visibility changes
 */
export function initDailyReminderCheck(onNavigateToAdd?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Immediate check
  checkAndTriggerEveningReminder(onNavigateToAdd);

  // Periodic check every 60 seconds
  const intervalId = window.setInterval(() => {
    checkAndTriggerEveningReminder(onNavigateToAdd);
  }, 60 * 1000);

  // Check whenever user switches tabs back to the app
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkAndTriggerEveningReminder(onNavigateToAdd);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
