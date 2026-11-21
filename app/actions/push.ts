'use server'

import {db} from '../../lib/supabase'
import {isPushEndpoint} from '../../lib/push-policy'

export async function managePush(
  action: 'status' | 'register' | 'remove',
  endpoint: string,
  keys?: {p256dh: string; auth: string},
) {
  if (typeof endpoint !== 'string' || !isPushEndpoint(endpoint)) return false
  const supabase = await db()
  const {data, error} = await supabase.rpc('manage_technician_push', {
    p_action: action,
    p_endpoint: endpoint,
    p_p256dh: keys?.p256dh ?? null,
    p_auth: keys?.auth ?? null,
  })
  if (error) throw new Error('Notifications could not be updated')
  return data === true
}
