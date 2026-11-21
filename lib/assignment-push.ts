import 'server-only'
import {createClient} from '@supabase/supabase-js'
import webPush from 'web-push'
import {classifyPushFailure, isPushEndpoint, pushRetryDelay} from './push-policy'

export async function deliverAssignmentPush() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const token = process.env.ASSIGNMENT_PUSH_WORKER_TOKEN
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT
  if (!url || !key || !token || !publicKey || !privateKey || !subject) return false

  const supabase = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  async function queue(action: string, id?: string, attempt?: number, retrySeconds?: number) {
    const {data, error} = await supabase.rpc('process_assignment_push', {
      p_token: token, p_action: action, p_id: id ?? null,
      p_attempt: attempt ?? null, p_retry_seconds: retrySeconds ?? null,
    })
    if (error) throw new Error('Assignment push queue operation failed')
    return data
  }
  const claims = await queue('claim')

  const results = await Promise.allSettled(
    (claims as {id: string; attempt: number}[]).map(async ({id, attempt}) => {
      const data = await queue('lookup', id, attempt)

      if (data && isPushEndpoint(data.endpoint)) {
        try {
          await webPush.sendNotification({
            endpoint: data.endpoint,
            keys: {p256dh: data.p256dh, auth: data.auth_secret},
          }, JSON.stringify({jobId: data.job_id, tag: id}), {
            vapidDetails: {subject, publicKey, privateKey},
            TTL: 300,
            timeout: 8000,
            // A retry after an ambiguous network failure replaces a pending push.
            topic: id.replaceAll('-', ''),
          })
        } catch (failure) {
          const status = (failure as {statusCode?: number})?.statusCode
          const result = classifyPushFailure(status)
          if (result === 'expired') {
            await queue('expire', id, attempt)
            return
          }
          if (result === 'retry' && attempt < 6) {
            await queue('retry', id, attempt, pushRetryDelay(attempt) / 1000)
            return
          }
          console.warn('Assignment push delivery discarded', {status, attempt})
        }
      }
      await queue('finish', id, attempt)
    }),
  )
  if (results.some(result => result.status === 'rejected')) {
    throw new Error('One or more assignment push deliveries could not be finalized')
  }
  return true
}
