import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {classifyPushFailure, isPushEndpoint, pushRetryDelay} from '../lib/push-policy.ts'

test('push accepts provider endpoints and rejects unrelated URLs', () => {
 for (const host of ['fcm.googleapis.com', 'web.push.apple.com', 'updates.push.services.mozilla.com', 'wns2-par03p.notify.windows.com']) {
  assert.equal(isPushEndpoint('https://' + host + '/push/token'), true)
 }
 for (const endpoint of ['http://fcm.googleapis.com/push', 'https://127.0.0.1/push',
  'https://fcm.googleapis.com.evil.test/push', 'https://fcm.googleapis.com@evil.test/push',
  'https://admin@fcm.googleapis.com/push', 'https://fcm.googleapis.com:8443/push',
  'https://fcm.googleapis.com/push#fragment']) {
  assert.equal(isPushEndpoint(endpoint), false, endpoint)
 }
})

test('transient failures back off and gone subscriptions are revoked', () => {
 for (const status of [undefined, 401, 403, 408, 429, 500, 503]) {
  assert.equal(classifyPushFailure(status), 'retry')
 }
 for (const status of [404, 410]) assert.equal(classifyPushFailure(status), 'expired')
 assert.equal(classifyPushFailure(400), 'discard')
 assert.deepEqual([1, 2, 3, 4, 5].map(pushRetryDelay), [60000, 240000, 960000, 3600000, 3600000])
})

test('push shows generic text and can open only a same-origin job', async () => {
 const listeners = new Map()
 const shown = []
 const opened = []
 const jobId = 'e9c763c4-5de0-40ad-8843-fc559314d755'
 const tag = 'bd807170-edc2-4e50-9d7f-ced36aea661b'
 runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
  URL,
  self: {
   addEventListener: (name, callback) => listeners.set(name, callback),
   registration: {showNotification: async (title, options) => shown.push({title, options})},
   clients: {openWindow: async url => opened.push(url)},
   location: {origin: 'https://cctv.example'},
  },
 })
 const waitUntil = promise => promise
 await listeners.get('push')({waitUntil, data: {json: () => ({jobId, tag, body: 'Customer name'})}})
 await listeners.get('push')({waitUntil, data: {json: () => ({jobId: '//evil.test', tag})}})
 assert.equal(shown.length, 1)
 assert.equal(shown[0].options.tag, tag)
 assert.doesNotMatch(shown[0].options.body, /Customer name/)
 await listeners.get('notificationclick')({waitUntil, notification: {close() {}, data: {jobId}}})
 await listeners.get('notificationclick')({waitUntil, notification: {close() {}, data: {jobId: '//evil.test'}}})
 assert.deepEqual(opened, ['https://cctv.example/jobs/' + jobId, 'https://cctv.example/dashboard'])
})
