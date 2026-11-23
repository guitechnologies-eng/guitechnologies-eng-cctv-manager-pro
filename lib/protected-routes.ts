/** Exact protected routes and their descendants only (no prefix collisions). */
const protectedRoots=['/dashboard','/jobs','/staff','/technician'] as const
export function isProtectedAppPath(pathname:string):boolean{
 return protectedRoots.some(root=>pathname===root||pathname.startsWith(root+'/'))
}
