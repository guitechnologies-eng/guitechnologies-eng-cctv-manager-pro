import {timingSafeEqual} from 'node:crypto'
import {deliverAssignmentPush} from '../../../lib/assignment-push'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const supplied = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return new Response(null, {status: 401})
  }
  try {
    const ready = await deliverAssignmentPush()
    return new Response(null, {status: ready ? 204 : 503})
  } catch {
    console.error('Assignment push worker failed')
    return new Response(null, {status: 503})
  }
}
