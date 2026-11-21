import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const parts=[0,1,2,3].map(i=>{
 const content=read('lib/brand/part'+i+'.ts')
 const match=/^export default '([A-Za-z0-9+/=]+)'\s*$/.exec(content)
 assert.ok(match,'Original GUI logo image must be a valid base64 segment: '+i)
 return match[1]
})
const jpeg=Buffer.from(parts.join(''),'base64')

test('the logo asset matches the reviewed original company artwork resize byte-for-byte',()=>{
 assert.equal(parts.join('').length,12800)
 assert.equal(jpeg.length,9598)
 assert.equal(jpeg.subarray(0,2).toString('hex'),'ffd8')
 assert.equal(jpeg.subarray(-2).toString('hex'),'ffd9')
 assert.equal(createHash('sha256').update(jpeg).digest('hex'),
  '844c451ea0622dadefe7394db7de35b4e39306bab0cf35354e8e5eb3c914b2d2')
})

test('login, shop/admin sidebar, staff and technician mobile use the same official logo',()=>{
 for(const path of [
  'app/login/page.tsx','app/dashboard/page.tsx','app/staff/page.tsx',
  'app/technician/layout.tsx','app/jobs/[id]/page.tsx'
 ]){
  assert.match(read(path),/<BrandLogo\b/,path)
 }
 const component=read('app/components/BrandLogo.tsx')
 assert.match(component,/src="\/brand-logo"/)
 assert.match(component,/unoptimized/)
 const endpoint=read('app/brand-logo/route.ts')
 assert.match(endpoint,/image\/jpeg/)
 assert.match(endpoint,/guiTechnologiesLogoBase64/)
})

test('every Android/iOS PWA icon and push alert points to original GUI logo',()=>{
 const route=read('app/icons/[size]/route.tsx')
 assert.match(route,/guiTechnologiesLogoDataUri/)
 assert.match(route,/180\.png/)
 assert.match(route,/192\.png/)
 assert.match(route,/512\.png/)
 assert.doesNotMatch(route,/MANAGER PRO<\/div>/)
 const manifest=read('app/manifest.ts')
 assert.match(manifest,/GUI CCTV Pro/)
 assert.match(manifest,/\/icons\/192\.png/)
 assert.match(manifest,/\/icons\/512\.png/)
 assert.match(read('public/sw.js'),/\/icons\/192\.png/)
})
