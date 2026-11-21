const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/

self.addEventListener('push', event => {
  let payload
  try {
    payload = event.data?.json()
  } catch {
    return
  }
  if (typeof payload?.jobId !== 'string' || !uuid.test(payload.jobId) ||
      typeof payload.tag !== 'string' || !uuid.test(payload.tag)) return

  event.waitUntil(self.registration.showNotification('CCTV Manager Pro', {
    body: 'You have a new job assignment. Open the app to view it.',
    icon: '/icons/192.png',
    tag: payload.tag,
    data: {jobId: payload.jobId},
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const jobId = event.notification.data?.jobId
  const path = typeof jobId === 'string' && uuid.test(jobId) ? '/jobs/' + jobId : '/dashboard'
  event.waitUntil(self.clients.openWindow(new URL(path, self.location.origin).href))
})
