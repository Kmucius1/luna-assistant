import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const VAPID_CONFIGURED = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

if (VAPID_CONFIGURED) {
  webpush.setVapidDetails(
    'mailto:info@drypdigital.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/** Sends one notification to every device a user has subscribed on. Prunes
 * subscriptions the push service reports as gone (410/404) so the table
 * doesn't accumulate dead endpoints forever. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; pruned: number }> {
  if (!VAPID_CONFIGURED) {
    console.error('[pushNotifications] VAPID keys not configured — skipping send')
    return { sent: 0, pruned: 0 }
  }

  const db = createAdminClient()
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  if (!subs || subs.length === 0) return { sent: 0, pruned: 0 }

  let sent = 0
  let pruned = 0

  await Promise.all(subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/home', tag: payload.tag }),
      )
      sent++
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('id', sub.id)
        pruned++
      } else {
        console.error('[pushNotifications] send failed:', err instanceof Error ? err.message : err)
      }
    }
  }))

  return { sent, pruned }
}

/** True if this (user, notification_key, date_key) has already fired today —
 * the cron runs hourly, so every send site must check this first. */
export async function alreadySentToday(userId: string, notificationKey: string, dateKey: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db.from('push_notification_log')
    .select('id').eq('user_id', userId).eq('notification_key', notificationKey).eq('date_key', dateKey).maybeSingle()
  return !!data
}

export async function markSentToday(userId: string, notificationKey: string, dateKey: string): Promise<void> {
  const db = createAdminClient()
  await db.from('push_notification_log').upsert(
    { user_id: userId, notification_key: notificationKey, date_key: dateKey },
    { onConflict: 'user_id,notification_key,date_key' },
  )
}
