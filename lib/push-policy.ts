const pushHosts = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

export function isPushEndpoint(endpoint: string) {
  if (endpoint.length > 2048 ||
      !/^https:\/\/[^/]+\/[^\s#]+$/.test(endpoint)) return false
  try {
    const url = new URL(endpoint)
    return !url.username && !url.password && !url.port && (
      pushHosts.has(url.hostname) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
    )
  } catch {
    return false
  }
}

export function classifyPushFailure(status: number | undefined) {
  if (status === 404 || status === 410) return 'expired'
  if (!status || status === 401 || status === 403 || status === 408 || status === 429 || status >= 500) return 'retry'
  return 'discard'
}

export function pushRetryDelay(attempt: number) {
  return Math.min(60 * 60_000, 60_000 * 4 ** (attempt - 1))
}
