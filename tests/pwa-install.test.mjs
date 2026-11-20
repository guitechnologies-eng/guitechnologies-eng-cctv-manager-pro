import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../app/manifest.ts'

test('CCTV Manager Pro is configured for phone installation',()=>{
 const app=manifest()
 assert.match(app.name,/CCTV Manager Pro/)
 assert.equal(app.start_url,'/dashboard')
 assert.equal(app.scope,'/')
 assert.equal(app.display,'standalone')
 assert.equal(app.theme_color,'#071625')
 assert.equal(app.background_color,'#071625')
 assert.equal(app.prefer_related_applications,false)
})

test('manifest includes installable Android icons with actual PNG routes',()=>{
 const icons=manifest().icons||[]
 for(const size of [192,512]){
  const candidate=icons.find(icon=>icon.sizes===size+'x'+size&&icon.purpose==='any')
  assert.ok(candidate,'missing '+size+' icon')
  assert.equal(candidate.type,'image/png')
  assert.equal(candidate.src,'/icons/'+size+'.png')
 }
 assert.ok(icons.some(icon=>icon.purpose==='maskable'&&icon.sizes==='512x512'))
})

test('PWA opens within the same HTTPS app scope, without external redirects',()=>{
 const app=manifest()
 assert.ok(app.start_url?.startsWith('/'))
 assert.ok(app.scope?.startsWith('/'))
 assert.ok(app.icons?.every(icon=>String(icon.src).startsWith('/')))
 assert.notEqual(app.display,'browser')
})
